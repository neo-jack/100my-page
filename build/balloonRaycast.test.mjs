import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import sharp from 'sharp';
import { createBalloonRaycast } from '../src/components/canvas/portfolio/balloonRaycast.ts';

test('real balloon alpha passes through transparent pixels and respects visibility/interaction', async () => {
  const { data, info } = await sharp(fileURLToPath(new URL('../public/textures/about/reactduzybalon.webp', import.meta.url)))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let reads = 0;
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({
    drawImage() {},
    getImageData() { reads++; return { data, width: info.width, height: info.height }; },
  }) }) };
  const texture = new THREE.Texture({ width: info.width, height: info.height });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial());
  const back = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial());
  back.position.z = -1;
  const group = new THREE.Group();
  group.add(front, back);
  group.updateMatrixWorld(true);
  let enabled = true;
  try {
    front.raycast = createBalloonRaycast(texture, () => enabled);
    createBalloonRaycast(texture, () => true);
    assert.equal(reads, 1, 'shared textures reuse their alpha mask');
    const ray = new THREE.Raycaster();
    const pick = (x, y) => {
      ray.set(new THREE.Vector3(((x + 0.5) / info.width - 0.5) * 2,
        (0.5 - (y + 0.5) / info.height) * 3, 5), new THREE.Vector3(0, 0, -1));
      return ray.intersectObjects([front, back], false)[0]?.object;
    };
    let transparent = 0;
    let opaque = 0;
    let solid;
    for (let y = 0; y < info.height; y += 23) {
      for (let x = 0; x < info.width; x += 19) {
        const alpha = data[(y * info.width + x) * 4 + 3];
        assert.equal(pick(x, y), alpha >= 32 ? front : back, `pixel ${x},${y}`);
        if (alpha >= 32) { opaque++; solid = [x, y]; } else transparent++;
      }
    }
    assert.ok(transparent > 0 && opaque > 0);
    enabled = false;
    assert.equal(pick(...solid), back, 'disabled balloon must not block another');
    enabled = true;
    front.visible = false;
    assert.equal(pick(...solid), back, 'popped body must not intercept');
    front.visible = true;
    group.visible = false;
    assert.equal(pick(...solid), back, 'hidden ancestors disable balloon picking');
  } finally {
    globalThis.document = previousDocument;
    texture.dispose();
    for (const mesh of [front, back]) { mesh.geometry.dispose(); mesh.material.dispose(); }
  }
});
