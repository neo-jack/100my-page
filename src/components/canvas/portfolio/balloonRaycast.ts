import * as THREE from 'three';

const masks = new WeakMap<THREE.Texture, ImageData>();

/** Cache the sketch silhouette, independent of the animated paint/reveal opacity. */
export function createBalloonRaycast(texture: THREE.Texture, interactive: () => boolean): THREE.Mesh['raycast'] {
  let mask = masks.get(texture);
  if (!mask) {
    const image = texture.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Cannot read balloon silhouette');
    context.drawImage(image, 0, 0);
    mask = context.getImageData(0, 0, canvas.width, canvas.height);
    masks.set(texture, mask);
  }
  const silhouette = mask;
  const hits: THREE.Intersection[] = [];
  const uv = new THREE.Vector2();

  return function (this: THREE.Mesh, raycaster, intersections) {
    if (!interactive()) return;
    for (let parent: THREE.Object3D | null = this; parent; parent = parent.parent) {
      if (!parent.visible) return;
    }
    hits.length = 0;
    THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
    for (const hit of hits) {
      if (!hit.uv) continue;
      uv.copy(hit.uv);
      texture.updateMatrix();
      texture.transformUv(uv);
      const x = THREE.MathUtils.clamp(Math.floor(uv.x * silhouette.width), 0, silhouette.width - 1);
      const y = THREE.MathUtils.clamp(Math.floor(uv.y * silhouette.height), 0, silhouette.height - 1);
      if (silhouette.data[(y * silhouette.width + x) * 4 + 3] >= 32) intersections.push(hit);
    }
    hits.length = 0;
  };
}
