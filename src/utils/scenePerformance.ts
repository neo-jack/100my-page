import type { Material, Mesh, Scene, ShaderMaterial, Texture, WebGLRenderer } from 'three';
import { getByteLength } from 'three/src/extras/TextureUtils.js';

type Metrics = { fps: number; calls: number; textureMiB: number | null };
const listeners = new Set<() => void>();
let snapshot: Metrics | null = null;
let started: number | undefined;
let frames = 0;

export const getScenePerformance = () => snapshot;
export function resetScenePerformanceWindow() {
  started = undefined;
  frames = 0;
}
export function subscribeScenePerformance(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      snapshot = null;
      resetScenePerformanceWindow();
    }
  };
}

/** Referenced texture storage only; not total device VRAM or driver allocations. */
function estimateTextureMiB(scene: Scene) {
  const textures = new Set<Texture>();
  const collect = (value: unknown) => {
    if ((value as Texture | null)?.isTexture) textures.add(value as Texture);
  };
  collect(scene.background);
  collect(scene.environment);
  scene.traverse((object) => {
    const material = (object as Mesh).material;
    if (!material) return;
    for (const entry of (Array.isArray(material) ? material : [material]) as Material[]) {
      Object.values(entry).forEach(collect);
      const uniforms = (entry as ShaderMaterial).uniforms;
      if (uniforms) Object.values(uniforms).forEach((uniform) => collect(uniform.value));
    }
  });
  let bytes = 0;
  try {
    for (const texture of textures) {
      const images = Array.isArray(texture.image) ? texture.image : [texture.image];
      for (const image of images) {
        const data = image?.image ?? image;
        if (!data?.width || !data?.height) continue;
        let width = data.width;
        let height = data.height;
        const depth = data.depth ?? 1;
        if (texture.mipmaps.length) {
          for (const mip of texture.mipmaps) bytes += getByteLength(mip.width, mip.height, texture.format, texture.type) * depth;
        } else {
          bytes += getByteLength(width, height, texture.format, texture.type) * depth;
          if (texture.generateMipmaps) {
            while (width > 1 || height > 1) {
              width = Math.max(1, Math.floor(width / 2));
              height = Math.max(1, Math.floor(height / 2));
              bytes += getByteLength(width, height, texture.format, texture.type) * depth;
            }
          }
        }
      }
    }
  } catch {
    return null; // Unsupported formats must not break the render loop.
  }
  return bytes / 1048576;
}

/** Called after the existing render, never starts a second animation loop. */
export function recordScenePerformance(time: number, renderer: WebGLRenderer, scene: Scene) {
  if (!listeners.size) return;
  if (started === undefined) { started = time; return; }
  frames += 1;
  const duration = time - started;
  if (duration < 1000) return;
  snapshot = {
    fps: Math.round(frames * 1000 / duration),
    calls: renderer.info.render.calls,
    textureMiB: estimateTextureMiB(scene),
  };
  started = time;
  frames = 0;
  listeners.forEach((listener) => listener());
}
