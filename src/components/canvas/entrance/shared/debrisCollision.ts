import * as THREE from 'three';

const STEP = 1 / 120;
const MAX_STEPS = 720;
const STRIDE = 8; // position, quaternion, supporting surface height
const GAP = 0.003;

export function createCollisionTrack() {
  return { frames: new Float32Array((MAX_STEPS + 1) * STRIDE), count: 0 };
}

interface CollisionFlight {
  origin: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  initial: THREE.Quaternion;
  rest: THREE.Quaternion;
  offset: THREE.Vector3;
  groundY: number;
  surfaceY: number;
  supportScale: number;
  track: ReturnType<typeof createCollisionTrack>;
}

/** Bake once at the accepted click. Playback and instant/reduced-motion settlement use the same path. */
export function bakeCollisionTrack(motion: CollisionFlight, geometry: THREE.BufferGeometry,
  boxes: readonly THREE.Box3[], restitution: number, soilBounds?: THREE.Box3) {
  const position = motion.origin.clone().add(motion.offset);
  const velocity = motion.velocity.clone();
  const previous = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const orientation = motion.initial.clone();
  const vertex = new THREE.Vector3();
  const bounds = new THREE.Box3();
  const expanded = new THREE.Box3();
  const vertices = geometry.getAttribute('position');
  const end = Math.min(vertices.count, geometry.drawRange.start + geometry.drawRange.count);
  const floor = soilBounds?.max.y ?? motion.groundY + motion.offset.y;
  let supportedY = floor;
  let calm = 0;

  const write = (frame: number) => {
    const start = frame * STRIDE;
    position.toArray(motion.track.frames, start);
    orientation.toArray(motion.track.frames, start + 3);
    motion.track.frames[start + 7] = supportedY;
  };
  write(0);
  for (let frame = 1; frame <= MAX_STEPS; frame++) {
    const time = frame * STEP;
    previous.copy(position);
    velocity.y -= 8.4 * STEP;
    velocity.x *= Math.exp(-1.25 * STEP);
    velocity.z *= Math.exp(-1.25 * STEP);
    position.addScaledVector(velocity, STEP);
    rotation.set(motion.spin.x * time, motion.spin.y * time, motion.spin.z * time);
    orientation.setFromEuler(rotation).premultiply(motion.initial)
      .slerp(motion.rest, THREE.MathUtils.smoothstep(time, 0.12, 0.65));

    // Rotated visible vertices, not an arbitrary radius. Flat petals and glass can lie flat.
    bounds.makeEmpty();
    for (let i = geometry.drawRange.start; i < end; i++) {
      vertex.fromBufferAttribute(vertices, i).multiplyScalar(motion.supportScale).applyQuaternion(orientation);
      bounds.expandByPoint(vertex);
    }
    // Keep the entire rotating flower inside its soil opening, not just its stem pivot.
    if (soilBounds) {
      for (const axis of ['x', 'z'] as const) {
        const contained = THREE.MathUtils.clamp(position[axis],
          soilBounds.min[axis] - bounds.min[axis] + GAP,
          soilBounds.max[axis] - bounds.max[axis] - GAP);
        if (contained !== position[axis]) velocity[axis] = 0;
        position[axis] = contained;
      }
    }
    let supported = false;
    supportedY = floor;
    // Substeps prevent tunnelling through a 0.055-unit rim; swept entry chooses the collision face.
    for (let pass = 0; pass < 3; pass++) {
      for (const box of boxes) {
        expanded.min.copy(box.min).sub(bounds.max).addScalar(-GAP);
        expanded.max.copy(box.max).sub(bounds.min).addScalar(GAP);
        if (!expanded.containsPoint(position)) continue;
        let axis: 'x' | 'y' | 'z' = 'y';
        let sign = 1;
        let entry = -Infinity;
        let exit = Infinity;
        for (const key of ['x', 'y', 'z'] as const) {
          const delta = position[key] - previous[key];
          if (Math.abs(delta) < 1e-10) continue;
          const a = (expanded.min[key] - previous[key]) / delta;
          const b = (expanded.max[key] - previous[key]) / delta;
          const near = Math.min(a, b);
          if (near > entry) { entry = near; axis = key; sign = delta > 0 ? -1 : 1; }
          exit = Math.min(exit, Math.max(a, b));
        }
        if (entry < 0 || entry > exit) {
          // Rotation can create overlap even without translation: use the smallest separating move.
          let distance = Infinity;
          for (const key of ['x', 'y', 'z'] as const) {
            const low = position[key] - expanded.min[key];
            const high = expanded.max[key] - position[key];
            if (Math.min(low, high) < distance) {
              distance = Math.min(low, high); axis = key; sign = low < high ? -1 : 1;
            }
          }
        }
        position[axis] = sign > 0 ? expanded.max[axis] : expanded.min[axis];
        if (velocity[axis] * sign < 0) velocity[axis] = -velocity[axis] * restitution;
        if (axis === 'y' && sign > 0) { supported = true; supportedY = Math.max(supportedY, box.max.y); }
      }
    }
    // A wide rotating shard may span both inner rims: opposing side resolutions cannot fit it
    // inside the trough. Support it across the lip instead of oscillating between the walls.
    for (const box of boxes) {
      expanded.min.copy(box.min).sub(bounds.max).addScalar(-GAP);
      expanded.max.copy(box.max).sub(bounds.min).addScalar(GAP);
      if (!expanded.containsPoint(position)) continue;
      position.y = expanded.max.y;
      if (velocity.y < 0) velocity.y = -velocity.y * restitution;
      supported = true;
      supportedY = Math.max(supportedY, box.max.y);
    }
    if (position.y + bounds.min.y <= floor + GAP) {
      position.y = floor - bounds.min.y + GAP;
      if (velocity.y < 0) velocity.y = -velocity.y * restitution;
      supported = true;
    }
    if (supported) {
      velocity.x *= Math.exp(-12 * STEP);
      velocity.z *= Math.exp(-12 * STEP);
      if (Math.abs(velocity.y) < 0.12) velocity.y = 0;
    }
    calm = supported && time > 0.7 && velocity.lengthSq() < 0.0001 ? calm + 1 : 0;
    write(frame);
    motion.track.count = frame + 1;
    if (calm >= 16) break;
  }
  return (motion.track.count - 1) * STEP;
}

/** Nearest fixed substep retains the collision guarantee (interpolated rotation can penetrate a rim). */
export function playCollisionTrack(object: THREE.Group, motion: CollisionFlight, elapsed: number) {
  const index = Math.min(motion.track.count - 1, Math.max(0, Math.floor(elapsed / STEP)));
  const start = index * STRIDE;
  object.position.fromArray(motion.track.frames, start).sub(motion.offset);
  object.quaternion.fromArray(motion.track.frames, start + 3);
  motion.surfaceY = motion.track.frames[start + 7] - motion.offset.y;
  return index === motion.track.count - 1;
}
