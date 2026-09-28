import * as THREE from 'three';
import { bakeCollisionTrack, createCollisionTrack, playCollisionTrack } from './debrisCollision';

const GRAVITY = 8.4;
const AIR_DRAG = 1.25;
const FLOOR_DRAG = 8;

export function createLandingMotion() {
  return {
    origin: new THREE.Vector3(), velocity: new THREE.Vector3(), spin: new THREE.Vector3(),
    rest: new THREE.Quaternion(), groundY: 0, fallDuration: 0, bounceSpeed: 0,
    restHeight: 0, duration: 0, supportScale: 1,
    initial: new THREE.Quaternion(), offset: new THREE.Vector3(),
    track: createCollisionTrack(), surfaceY: 0,
  };
}

export type LandingMotion = ReturnType<typeof createLandingMotion>;

/** Actual rotated vertex support keeps both flat shards and uneven stones above the floor. */
function supportHeight(geometry: THREE.BufferGeometry, q: THREE.Quaternion, scale: number) {
  const x = 2 * (q.x * q.y + q.w * q.z);
  const y = 1 - 2 * (q.x * q.x + q.z * q.z);
  const z = 2 * (q.y * q.z - q.w * q.x);
  const vertices = geometry.getAttribute('position');
  const end = Math.min(vertices.count, geometry.drawRange.start + geometry.drawRange.count);
  let bottom = Infinity;
  for (let i = geometry.drawRange.start; i < end; i++) {
    bottom = Math.min(bottom, x * vertices.getX(i) + y * vertices.getY(i) + z * vertices.getZ(i));
  }
  return -bottom * scale + 0.003;
}

export function prepareLanding(motion: LandingMotion, geometry: THREE.BufferGeometry, restitution: number,
  colliders: readonly THREE.Box3[] = [], soilBounds?: THREE.Box3) {
  motion.track.count = 0;
  motion.surfaceY = motion.groundY;
  if (colliders.length || soilBounds) {
    motion.duration = bakeCollisionTrack(motion, geometry, colliders, restitution, soilBounds);
    return;
  }
  motion.restHeight = supportHeight(geometry, motion.rest, motion.supportScale);
  const height = Math.max(0, motion.origin.y - motion.groundY - motion.restHeight);
  const speed = Math.sqrt(motion.velocity.y ** 2 + 2 * GRAVITY * height);
  motion.fallDuration = (motion.velocity.y + speed) / GRAVITY;
  motion.bounceSpeed = speed * restitution;
  motion.duration = motion.fallDuration + 2 * motion.bounceSpeed / GRAVITY + 0.4;
}

/** A closed-form fall, one small bounce and frictional slide; no rigid-body engine needed. */
export function placeDebris(object: THREE.Group, geometry: THREE.BufferGeometry, motion: LandingMotion, elapsed: number) {
  if (motion.track.count) {
    return playCollisionTrack(object, motion, elapsed);
  }
  const time = Math.min(Math.max(0, elapsed), motion.duration);
  const airTime = Math.min(time, motion.fallDuration);
  const groundTime = Math.max(0, time - motion.fallDuration);
  const airTravel = (1 - Math.exp(-AIR_DRAG * airTime)) / AIR_DRAG;
  const groundTravel = Math.exp(-AIR_DRAG * airTime) * (1 - Math.exp(-FLOOR_DRAG * groundTime)) / FLOOR_DRAG;
  const travel = airTravel + groundTravel;
  object.position.copy(motion.origin).addScaledVector(motion.velocity, travel);
  const bounce = Math.max(0, motion.bounceSpeed * groundTime - GRAVITY * groundTime * groundTime / 2);
  const y = time < motion.fallDuration
    ? motion.origin.y + motion.velocity.y * time - GRAVITY * time * time / 2
    : motion.groundY + motion.restHeight + bounce;
  object.rotation.set(motion.spin.x * airTime, motion.spin.y * airTime, motion.spin.z * airTime);
  // Lay shards flat before contact; stones turn onto their broad side.
  object.quaternion.slerp(motion.rest, THREE.MathUtils.smoothstep(time, motion.fallDuration * 0.62, motion.fallDuration));
  object.position.y = Math.max(y, motion.groundY + supportHeight(geometry, object.quaternion, motion.supportScale));
  return elapsed >= motion.duration;
}
