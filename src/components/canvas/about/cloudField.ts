export const CHUNK_LENGTH = 41;
export const CLOUD_TEXTURE_COUNT = 8;

// Addressable sampling: changing one property never shifts all later samples.
function sample(seed: number, channel: number) {
    let value = (seed + Math.imul(channel + 1, 0x9e3779b1)) | 0;
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
    return ((value ^ (value >>> 15)) >>> 0) / 0x100000000;
}

export function sampleWind(coordinate: number, seed: number) {
    const cell = Math.floor(coordinate);
    const fraction = coordinate - cell;
    const blend = fraction * fraction * fraction * (fraction * (fraction * 6 - 15) + 10);
    return (sample(seed, cell) * (1 - blend) + sample(seed, cell + 1) * blend) * 2 - 1;
}

export function createCloudField(chunkIndex: number, seed: number) {
    const chunkSeed = seed ^ Math.imul(chunkIndex, 0x632be5ab);
    const clouds = [];
    // Six cells: staggered depth bands on both sides of a clear center.
    for (let band = 0; band < 3; band++) {
        for (const side of [-1, 1]) {
            const cellSeed = chunkSeed ^ Math.imul(band * 2 + (side + 1) / 2 + 1, 0x85157af5);
            const count = 2 + (sample(cellSeed, 0) > 0.85 ? 1 : 0);
            for (let slot = 0; slot < count; slot++) {
                const shapeSeed = cellSeed ^ Math.imul(slot + 1, 0x58f38ded);
                const width = 3.2 + sample(shapeSeed, 1) * 3.6;
                const height = 1.15 + sample(shapeSeed, 2) * 1.35;
                clouds.push({
                    id: `${chunkIndex}:${band}:${side}:${slot}`,
                    shapeSeed,
                    textureIndex: Math.floor(sample(shapeSeed, 8) * CLOUD_TEXTURE_COUNT),
                    windSeed: seed,
                    side,
                    width,
                    height,
                    opacity: 0.58 + sample(shapeSeed, 3) * 0.25,
                    tilt: (sample(shapeSeed, 4) - 0.5) * 0.16,
                    position: [
                        side * (2.6 + sample(shapeSeed, 5) * 6.8),
                        -4.8 + ((slot + 0.2 + sample(shapeSeed, 6) * 0.6) / count) * 9.6,
                        -15 - (chunkIndex + (band + 0.15 + sample(shapeSeed, 7) * 0.7) / 3) * CHUNK_LENGTH,
                    ] as [number, number, number],
                });
            }
        }
    }
    return clouds;
}

// Fixed pool: scrolling chooses a variant without drawing or uploading new images.
let cloudCanvases: Promise<HTMLCanvasElement[]> | undefined;
export function loadCloudCanvases() {
    return cloudCanvases ??= (async () => {
        const canvases: HTMLCanvasElement[] = [];
        for (let index = 0; index < CLOUD_TEXTURE_COUNT; index++) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            canvases.push(drawCloud(Math.imul(index + 1, 0x58f38ded)));
        }
        return canvases;
    })();
}

function drawCloud(seed: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cloud canvas is unavailable');
    // Preserve stroke proportions at the smaller physical resolution.
    const w = 1024;
    const h = 512;
    ctx.scale(canvas.width / w, canvas.height / h);
    const silhouette = new Path2D();
    const volumes: { x: number; y: number; rx: number; ry: number }[] = [];
    // Fill the union in one pass, avoiding seams between overlapping lobes.
    const lobes = 5 + Math.floor(sample(seed, 20) * 4);
    for (let i = 0; i < lobes; i++) {
        const x = w * (0.18 + i / (lobes - 1) * 0.64);
        const y = h * (0.51 + (sample(seed, 30 + i) - 0.5) * 0.12);
        const rx = w * (0.10 + sample(seed, 50 + i) * 0.07);
        const ry = h * (0.19 + Math.sin(i / (lobes - 1) * Math.PI) * 0.17);
        volumes.push({ x, y, rx, ry });
        silhouette.moveTo(x + rx, y);
        silhouette.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    }
    const wash = ctx.createLinearGradient(0, h * 0.15, 0, h * 0.85);
    wash.addColorStop(0, '#fdfcf8');
    wash.addColorStop(0.45, '#eeede8');
    wash.addColorStop(0.75, '#d3d4d1');
    wash.addColorStop(1, '#aeb4b6');
    ctx.fillStyle = wash;
    ctx.fill(silhouette);
    ctx.save();
    ctx.clip(silhouette);
    // Broad translucent highlights describe volume without outlining each ellipse.
    for (const { x, y, rx, ry } of volumes) {
        ctx.save();
        ctx.translate(x - rx * 0.18, y - ry * 0.24);
        ctx.scale(rx, ry);
        const light = ctx.createRadialGradient(-0.15, -0.2, 0.05, 0, 0, 1.15);
        light.addColorStop(0, 'rgba(255,254,250,0.65)');
        light.addColorStop(0.55, 'rgba(255,254,250,0.22)');
        light.addColorStop(1, 'rgba(255,254,250,0)');
        ctx.fillStyle = light;
        ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
        ctx.restore();
    }
    // Broken graphite strokes stay in texture space and soften naturally in mipmaps.
    ctx.lineCap = 'round';
    for (let i = 0; i < 700; i++) {
        const channel = 2000 + i * 6;
        const x = sample(seed, channel) * w;
        const y = sample(seed, channel + 1) * h;
        const shade = Math.max(0, Math.min(1, (y / h - 0.25) / 0.55));
        const length = 8 + sample(seed, channel + 2) * 40;
        ctx.strokeStyle = `rgba(65,71,74,${0.12 + shade * 0.23 + sample(seed, channel + 3) * 0.09})`;
        ctx.lineWidth = 1.2 + sample(seed, channel + 4) * 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + length * 0.45, y - length * 0.12, x + length, y - length * 0.38);
        ctx.stroke();
    }
    // A few incomplete under-folds make the lobes readable without bubble seams.
    volumes.slice(1, -1).forEach(({ x, y, rx, ry }, i) => {
        ctx.strokeStyle = 'rgba(91,98,100,0.28)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(x, y, rx * 0.83, ry * 0.82, 0,
            Math.PI * (0.18 + sample(seed, 9000 + i) * 0.12), Math.PI * 0.78);
        ctx.stroke();
    });
    for (let i = 0; i < 600; i++) {
        const channel = 10000 + i * 3;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,253,0.24)' : 'rgba(86,92,94,0.07)';
        ctx.fillRect(sample(seed, channel) * w, sample(seed, channel + 1) * h,
            0.5 + sample(seed, channel + 2), 0.65);
    }
    ctx.restore();
    return canvas;
}
