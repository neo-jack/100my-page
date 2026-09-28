import * as THREE from 'three';

type Point = [number, number, number];
type UV = [number, number];

const PAPER_THICKNESS = 0.009;
const NOSE: Point = [0, 0.035, -1.35];
const FOLD: Point = [0, 0.10, 0.37];
const TAIL: Point = [0, -0.14, 0.70];
const LEFT_WING: Point = [-1.30, 0, 0.56];
// 尾缘先沿翼展平缓收拢，再弯向中央下折尖，避免做成厚重的三角底座。
const LEFT_TRAILING: Point[] = [
    LEFT_WING,
    [-1.292, -0.037, 0.565],
    [-0.38, -0.041, 0.65],
    [-0.20, -0.047, 0.672],
    [-0.145, -0.061, 0.683],
    [-0.105, -0.086, 0.69],
    TAIL,
];

const mirror = ([x, y, z]: Point): Point => [-x, y, z];
const underneath = ([x, y, z]: Point): Point => [x, y - PAPER_THICKNESS, z];
const foldUV = ([x, , z]: Point): UV => [Math.abs(x) / 1.30, (z - FOLD[2]) / (TAIL[2] - FOLD[2])];

/** 固定种子绘制纸纤维和断续铅笔排线；不依赖参考图或额外网络资源。 */
async function createPaperCanvas() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create the paper airplane texture.');

    let seed = 7319;
    const random = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return (seed >>> 0) / 4294967296;
    };

    context.fillStyle = '#fdfcf9';
    context.fillRect(0, 0, size, size);
    for (let i = 0; i < 26000; i++) {
        if (i % 256 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const shade = Math.floor(150 + random() * 80);
        context.fillStyle = `rgba(${shade},${shade},${shade - 4},${0.025 + random() * 0.075})`;
        context.fillRect(random() * size, random() * size, 0.5 + random() * 1.6, 0.5 + random());
    }

    // UV 的左缘是中央折脊，下缘是后折线；阴影随真实纸面一起旋转。
    const creaseShade = context.createLinearGradient(0, 0, size * 0.18, 0);
    creaseShade.addColorStop(0, 'rgba(75, 74, 69, 0.16)');
    creaseShade.addColorStop(0.2, 'rgba(90, 89, 84, 0.045)');
    creaseShade.addColorStop(1, 'rgba(90, 89, 84, 0)');
    context.fillStyle = creaseShade;
    context.fillRect(0, 0, size, size);
    const foldShade = context.createLinearGradient(0, size, 0, size * 0.84);
    foldShade.addColorStop(0, 'rgba(73, 72, 68, 0.15)');
    foldShade.addColorStop(0.25, 'rgba(73, 72, 68, 0.035)');
    foldShade.addColorStop(1, 'rgba(73, 72, 68, 0)');
    context.fillStyle = foldShade;
    context.fillRect(0, 0, size, size);

    context.lineCap = 'round';
    for (let i = 0; i < 2300; i++) {
        if (i % 64 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const x = random() * size;
        const y = random() * size;
        const length = 14 + random() * 76;
        const nearFold = Math.exp(-x / 85) + Math.exp(-(size - y) / 80);
        context.strokeStyle = `rgba(87, 86, 81, ${0.065 + random() * 0.15 + nearFold * 0.08})`;
        context.lineWidth = 0.9 + random() * 1.6;
        context.beginPath();
        context.moveTo(x, y);
        context.quadraticCurveTo(x + length * 0.43, y + length * 0.48 + random() * 5, x + length, y + length * 1.1);
        context.stroke();
    }

    return canvas;
}

// Cache pixel preparation across Suspense retries; each mounted model owns its GPU texture.
let paperCanvas: Promise<HTMLCanvasElement> | undefined;
export function loadPaperCanvas() {
    return paperCanvas ??= createPaperCanvas();
}

export function createPaperAirplaneModel(canvas: HTMLCanvasElement) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const creases: Point[] = [];

    const triangle = (points: Point[], coordinates: UV[], shades: number[], reverse = false) => {
        for (const i of reverse ? [2, 1, 0] : [0, 1, 2]) {
            positions.push(...points[i]);
            uvs.push(...coordinates[i]);
            // 线性空间的顶点色只提供折面明暗，铅笔细节由 sRGB 贴图提供。
            colors.push(shades[i], shades[i], shades[i]);
        }
    };
    const paperFace = (points: Point[], coordinates: UV[], shades: number[], reverse: boolean) => {
        triangle(points, coordinates, shades, reverse);
        triangle(
            [underneath(points[2]), underneath(points[1]), underneath(points[0])],
            [coordinates[2], coordinates[1], coordinates[0]],
            [shades[2] * 0.91, shades[1] * 0.91, shades[0] * 0.91],
            reverse,
        );
    };

    for (const side of [-1, 1]) {
        const wing = side === -1 ? LEFT_WING : mirror(LEFT_WING);
        const trailing = side === -1 ? LEFT_TRAILING : LEFT_TRAILING.map(mirror);
        const reverse = side === 1;
        paperFace([NOSE, wing, FOLD], [[0, 1], [1, 0], [0, 0]],
            side === -1 ? [0.98, 0.94, 0.89] : [1, 0.99, 0.95], reverse);

        for (let i = 0; i < trailing.length - 1; i++) {
            const a = trailing[i];
            const b = trailing[i + 1];
            paperFace([FOLD, a, b], [[0, 0], foldUV(a), foldUV(b)],
                side === -1 ? [0.59, 0.82, 0.82] : [0.72, 0.94, 0.94], reverse);
        }

        // 闭合薄纸的外围，飞行横滚时不会露出没有厚度的破面。
        const perimeter = [NOSE, ...trailing];
        for (let i = 0; i < perimeter.length - 1; i++) {
            const a = perimeter[i];
            const b = perimeter[i + 1];
            triangle([a, underneath(a), b], [[0, 0], [0, 0.03], [1, 0]], [0.69, 0.65, 0.73], reverse);
            triangle([b, underneath(a), underneath(b)], [[1, 0], [0, 0.03], [1, 0.03]], [0.73, 0.65, 0.69], reverse);
        }
        creases.push(FOLD, wing);
    }
    creases.push(NOSE, FOLD, FOLD, TAIL);

    const geometry = new THREE.BufferGeometry();
    // 每个折面保留独立颜色/UV；不要跨折线平均顶点色或法线。
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { geometry, texture, creases };
}
