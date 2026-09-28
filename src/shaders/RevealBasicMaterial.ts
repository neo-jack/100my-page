import * as THREE from 'three';
import type { ThreeElement } from '@react-three/fiber';

declare module '@react-three/fiber' {
    interface ThreeElements {
        revealBasicMaterial: ThreeElement<typeof RevealBasicMaterial>;
    }
}

type CompiledShader = Parameters<THREE.MeshBasicMaterial['onBeforeCompile']>[0];

/**
 * RevealBasicMaterial - 扩展 MeshBasicMaterial 实现笔触揭示效果
 *
 * 从草图纹理（sketchMap）到涂色纹理（colorMap）的渐进显示动画。
 * 通过 uProgress (0.0-1.0) 参数控制显示进度，沿 UV 纵向逐渐揭示。
 *
 * 使用场景：
 * - 笔触动画效果
 * - 渐进式内容显示
 * - 无光照的 UI 元素
 *
 * @example
 * const material = new RevealBasicMaterial({
 *   map: sketchTexture,
 *   transparent: true
 * });
 * material.uProgress = 0.5; // 50% 显示进度
 */
export class RevealBasicMaterial extends THREE.MeshBasicMaterial {
    private _uProgress: number;
    private _shader: CompiledShader | null;

    constructor(parameters?: THREE.MeshBasicMaterialParameters) {
        super(parameters);
        this._uProgress = 0.0;
        this._shader = null;
    }

    get uProgress(): number {
        return this._uProgress;
    }

    set uProgress(value: number) {
        this._uProgress = value;
        if (this._shader) {
            this._shader.uniforms.uProgress.value = value;
        }
    }

    customProgramCacheKey(): string {
        return 'paper-wash-2';
    }

    onBeforeCompile(shader: CompiledShader): void {
        this._shader = shader;
        shader.uniforms.uProgress = { value: this._uProgress };

        // 注入噪声函数到片段着色器
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            /* glsl */`
            #include <common>
            uniform float uProgress;

            float paperCell(vec2 cell) {
                vec3 grain = fract(vec3(cell, cell.x + cell.y) * vec3(0.1099, 0.1379, 0.1733));
                grain += dot(grain, grain.yzx + 19.19);
                return fract((grain.x + grain.z) * grain.y);
            }

            // 五次插值令纸纤维边缘在格点处保持平滑。
            float paperWash(vec2 uv) {
                vec2 sampleAt = uv * vec2(14.4, 15.7) + vec2(2.3, 5.1);
                vec2 cell = floor(sampleAt);
                vec2 f = fract(sampleAt);
                vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
                vec4 corners = vec4(paperCell(cell), paperCell(cell + vec2(1.0, 0.0)),
                                    paperCell(cell + vec2(0.0, 1.0)), paperCell(cell + vec2(1.0)));
                float lower = dot(corners.xy, vec2(1.0 - w.x, w.x));
                float upper = dot(corners.zw, vec2(1.0 - w.x, w.x));
                float grain = mix(lower, upper, w.y);
                return grain * (0.65 + 0.35 * grain);
            }
            `
        );

        // 沿 UV 纵向擦去草图层，显露彩绘底层。
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <alphatest_fragment>',
            /* glsl */`
            #include <alphatest_fragment>

            // 保留零进度草图与满进度彩绘两个端点。
            if (uProgress > 0.001) {
                float paperEdge = (1.0 - vMapUv.y) + 0.135 * paperWash(vMapUv);
                if (paperEdge < clamp(uProgress, 0.0, 1.0) * 1.46) discard;
            }
            `
        );
    }
}
