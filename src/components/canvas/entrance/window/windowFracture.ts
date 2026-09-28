import * as THREE from 'three';

export const PANE_SIZE = 0.56;
const SECTORS = 16;
export const SHARD_COUNT = SECTORS * 3;
type Point = [number, number];

export interface WindowShard {
  geometry: THREE.BufferGeometry;
  outline: THREE.BufferGeometry;
  center: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  retained: boolean;
  delay: number;
}

// Fixed per-pane buffers are uploaded during SceneWarmup, then filled at first impact.
export function createWindowShards(count = SHARD_COUNT): WindowShard[] {
  return Array.from({ length: count }, () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(144), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(96), 2).setUsage(THREE.DynamicDrawUsage));
    const outline = new THREE.BufferGeometry();
    outline.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(48), 3).setUsage(THREE.DynamicDrawUsage));
    return {
      geometry, outline, center: new THREE.Vector3(), velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(), retained: false, delay: 0,
    };
  });
}

/** Preserve the torn rim separately from the shards that fall to the floor. */
export function copyWindowShard(target: WindowShard, source: WindowShard) {
  for (const name of ['position', 'uv']) {
    const attribute = target.geometry.getAttribute(name) as THREE.BufferAttribute;
    attribute.copyArray(source.geometry.getAttribute(name).array);
    attribute.needsUpdate = true;
  }
  const outline = target.outline.getAttribute('position') as THREE.BufferAttribute;
  outline.copyArray(source.outline.getAttribute('position').array);
  outline.needsUpdate = true;
  target.geometry.setDrawRange(0, source.geometry.drawRange.count);
  target.outline.setDrawRange(0, source.outline.drawRange.count);
  target.geometry.computeBoundingSphere();
  target.outline.computeBoundingSphere();
  target.center.copy(source.center);
}

function roughEdge(a: Point, b: Point): Point[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  // Reversing an edge produces the same teeth, so adjacent pieces still fit.
  const offset = Math.min(length * 0.055, 0.005) * Math.sin((a[0] + b[0]) * 91 + (a[1] + b[1]) * 57);
  return [a, [a[0] + dx / 3 - dy / length * offset, a[1] + dy / 3 + dx / length * offset],
    [a[0] + dx * 2 / 3 + dy / length * offset, a[1] + dy * 2 / 3 - dx / length * offset]];
}

function writeShard(shard: WindowShard, corners: Point[], index: number, hit: Point, random: () => number, size: readonly [number, number]) {
  const points = corners.flatMap((point, i) => roughEdge(point, corners[(i + 1) % corners.length]));
  const cx = corners.reduce((sum, p) => sum + p[0], 0) / corners.length;
  const cy = corners.reduce((sum, p) => sum + p[1], 0) / corners.length;
  shard.center.set(cx, cy, 0);
  const position = shard.geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = shard.geometry.getAttribute('uv') as THREE.BufferAttribute;
  const outline = shard.outline.getAttribute('position') as THREE.BufferAttribute;
  points.forEach((p, i) => {
    const next = points[(i + 1) % points.length];
    // A slightly lifted center gives each paper shard a small folded ridge.
    position.setXYZ(i * 3, 0, 0, 0.004);
    position.setXYZ(i * 3 + 1, p[0] - cx, p[1] - cy, 0);
    position.setXYZ(i * 3 + 2, next[0] - cx, next[1] - cy, 0);
    uv.setXY(i * 3, cx / size[0] + 0.5, cy / size[1] + 0.5);
    uv.setXY(i * 3 + 1, p[0] / size[0] + 0.5, p[1] / size[1] + 0.5);
    uv.setXY(i * 3 + 2, next[0] / size[0] + 0.5, next[1] / size[1] + 0.5);
    outline.setXYZ(i, p[0] - cx, p[1] - cy, 0.002);
  });
  position.needsUpdate = uv.needsUpdate = outline.needsUpdate = true;
  shard.geometry.setDrawRange(0, points.length * 3);
  shard.outline.setDrawRange(0, points.length);
  shard.geometry.computeBoundingSphere();
  shard.outline.computeBoundingSphere();
  shard.retained = index % 3 === 2;
  const distance = Math.hypot(cx - hit[0], cy - hit[1]);
  const power = 1.15 + random() * 1.35;
  shard.velocity.set((cx - hit[0]) * 5.5, (cy - hit[1]) * 5.5 + 0.65, power);
  shard.spin.set((random() - 0.5) * 13, (random() - 0.5) * 15, (random() - 0.5) * 9);
  shard.delay = distance * 0.09;
}

/** Radial cracks share jagged boundaries and cover a rectangular pane, including corners. */
export function fractureWindow(shards: WindowShard[], x: number, y: number, seed: number, size: readonly [number, number] = [PANE_SIZE, PANE_SIZE]) {
  const [width, height] = size;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const hit: Point = [THREE.MathUtils.clamp(x, -halfWidth + 0.035, halfWidth - 0.035), THREE.MathUtils.clamp(y, -halfHeight + 0.035, halfHeight - 0.035)];
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const border: Point[] = [];
  for (let side = 0; side < 4; side++) {
    for (let step = 0; step < 4; step++) {
      const t = (step + (step === 0 ? 0 : (random() - 0.5) * 0.55)) / 4;
      border.push(side === 0 ? [-halfWidth + width * t, -halfHeight] : side === 1 ? [halfWidth, -halfHeight + height * t]
        : side === 2 ? [halfWidth - width * t, halfHeight] : [-halfWidth, halfHeight - height * t]);
    }
  }
  const inner = border.map((p): Point => {
    const t = 0.16 + random() * 0.18;
    return [hit[0] + (p[0] - hit[0]) * t, hit[1] + (p[1] - hit[1]) * t];
  });
  const rim = border.map((p, i): Point => {
    const t = (i % 2 ? 0.72 : 0.9) + random() * 0.055;
    return [hit[0] + (p[0] - hit[0]) * t, hit[1] + (p[1] - hit[1]) * t];
  });
  for (let i = 0; i < SECTORS; i++) {
    const j = (i + 1) % SECTORS;
    writeShard(shards[i * 3], [hit, inner[i], inner[j]], i * 3, hit, random, size);
    writeShard(shards[i * 3 + 1], [inner[i], rim[i], rim[j], inner[j]], i * 3 + 1, hit, random, size);
    writeShard(shards[i * 3 + 2], [rim[i], border[i], border[j], rim[j]], i * 3 + 2, hit, random, size);
  }
}
