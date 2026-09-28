import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { createLandingMotion, placeDebris, prepareLanding } from '../shared/windowDebris';
import type { PlanterLayout, PlanterPart } from './planterLayout';

interface PlanterTextures {
  gardenWood: THREE.Texture;
  gardenDaisy: THREE.Texture;
  gardenCosmos: THREE.Texture;
  gardenTulip: THREE.Texture;
  gardenAloe: THREE.Texture;
  floorPaper: THREE.Texture;
}

interface EntrancePlantersProps {
  layout: PlanterLayout;
  colliders: readonly THREE.Box3[];
  textures: PlanterTextures;
  interactive: boolean;
  groundY: number;
}

const SPLIT = 0.19;
const SNAP_TIME = 0.18;

interface FlowerPalette {
  petals: string;
  bloomStart: number;
  centerY?: number;
}

const FLOWER_PALETTES: readonly FlowerPalette[] = [
  { petals: '#ceba80', bloomStart: 0.64, centerY: 0.82 },
  { petals: '#cc9693', bloomStart: 0.64 },
  { petals: '#af9ebf', bloomStart: 0.59, centerY: 0.745 },
  { petals: '#d2c292', bloomStart: 0.64, centerY: 0.82 },
  { petals: '#cfa589', bloomStart: 0.64 },
];

function makeFlower(texture: THREE.Texture, height: number, palette: FlowerPalette) {
  const image = texture.image as HTMLImageElement;
  const width = height * image.width / image.height;
  const lower = new THREE.PlaneGeometry(width, height * SPLIT);
  lower.translate(0, height * SPLIT / 2, 0);
  const upper = new THREE.PlaneGeometry(width, height * (1 - SPLIT), 16, 40);
  upper.translate(0, height * (1 - SPLIT) / 2, 0);
  const foliage = new THREE.Color('#aebe98');
  const petals = new THREE.Color(palette.petals);
  const center = new THREE.Color('#bf9f5a');
  const tint = new THREE.Color();
  for (const [geometry, bottom, span] of [[lower, 0, SPLIT], [upper, SPLIT, 1 - SPLIT]] as const) {
    const uv = geometry.getAttribute('uv');
    const colors = new THREE.Float32BufferAttribute(new Float32Array(uv.count * 3), 3);
    for (let i = 0; i < uv.count; i++) {
      const y = bottom + uv.getY(i) * span;
      uv.setY(i, y);
      // Tint the original pencil drawing in UV space so detached blooms retain their colors.
      tint.copy(foliage).lerp(petals, THREE.MathUtils.smoothstep(y, palette.bloomStart, palette.bloomStart + 0.045));
      if (palette.centerY !== undefined) {
        const radius = Math.hypot((uv.getX(i) - 0.5) / 0.13, (y - palette.centerY) / 0.055);
        tint.lerp(center, 1 - THREE.MathUtils.smoothstep(radius, 0.65, 1.15));
      }
      colors.setXYZ(i, tint.r, tint.g, tint.b);
    }
    geometry.setAttribute('color', colors);
  }

  // A small alpha lookup makes clicks respect the drawn petals/leaves, including transparent gaps.
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const support: number[] = [];
  for (let y = 0; y < 128 * (1 - SPLIT); y++) {
    let left = 64;
    let right = -1;
    for (let x = 0; x < 64; x++) {
      if (pixels[(y * 64 + x) * 4 + 3] > 80) { left = Math.min(left, x); right = x; }
    }
    if (right < 0) continue;
    for (const x of [left, right + 1]) {
      support.push((x / 64 - 0.5) * width, Math.max(0, (1 - y / 128 - SPLIT) * height), 0);
    }
  }
  const supportGeometry = new THREE.BufferGeometry();
  supportGeometry.setAttribute('position', new THREE.Float32BufferAttribute(support, 3));
  const material = new THREE.MeshBasicMaterial({ map: texture, vertexColors: true, side: THREE.DoubleSide,
    transparent: true, alphaTest: 0.35, depthWrite: true });
  return { lower, upper, material, supportGeometry, pixels, width, dispose() {
    lower.dispose(); upper.dispose(); supportGeometry.dispose(); material.dispose();
  } };
}

function Flower({ texture, palette, position, height, index, interactive, groundY, colliders, soilBounds, name }: {
  texture: THREE.Texture; position: [number, number, number]; height: number; index: number;
  palette: FlowerPalette;
  interactive: boolean; groundY: number; colliders: readonly THREE.Box3[]; name: string;
  soilBounds: THREE.Box3;
}) {
  const upper = useRef<THREE.Group>(null);
  const asset = useMemo(() => makeFlower(texture, height, palette), [texture, height, palette]);
  const motion = useMemo(createLandingMotion, []);
  const state = useRef({ broken: false, active: false, elapsed: 0, hover: false });
  const direction = position[0] < (soilBounds.min.x + soilBounds.max.x) / 2 ? -1 : 1;

  useEffect(() => () => asset.dispose(), [asset]);
  useEffect(() => {
    if (interactive) return;
    if (state.current.active && upper.current) {
      placeDebris(upper.current, asset.supportGeometry, motion, Infinity);
      state.current.active = false;
    }
    if (state.current.hover) document.body.style.cursor = 'auto';
    state.current.hover = false;
  }, [interactive, asset, motion]);
  useEffect(() => () => { if (state.current.hover) document.body.style.cursor = 'auto'; }, []);

  const opaqueHit = (event: ThreeEvent<MouseEvent | PointerEvent>) => {
    if (!event.uv) return false;
    const x = THREE.MathUtils.clamp(Math.floor(event.uv.x * 64), 0, 63);
    const y = THREE.MathUtils.clamp(Math.floor((1 - event.uv.y) * 128), 0, 127);
    return asset.pixels[(y * 64 + x) * 4 + 3] > 60;
  };
  const snap = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || event.delta > 6 || !opaqueHit(event)) return;
    event.stopPropagation();
    if (state.current.broken || !upper.current) return;
    // Reserve immediately: rapid clicks cannot create more stems or re-launch the same flower.
    state.current.broken = true;
    state.current.hover = false;
    state.current.elapsed = 0;
    document.body.style.cursor = 'auto';
    motion.origin.set(0, height * SPLIT, 0);
    motion.offset.set(...position);
    motion.groundY = groundY - position[1];
    motion.initial.setFromEuler(new THREE.Euler(0, 0, direction * 0.28));
    // Fold inward along the trough's long axis so the detached stem fits between the rims.
    motion.rest.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, direction * (Math.PI / 2 + (index % 3 - 1) * 0.08)));
    motion.velocity.set(-direction * 0.08, 0.2, 0.02);
    motion.spin.set(0, 0, 0);
    prepareLanding(motion, asset.supportGeometry, 0.04, colliders, soilBounds);
    upper.current.userData.broken = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      placeDebris(upper.current, asset.supportGeometry, motion, Infinity);
    } else state.current.active = true;
  };

  useFrame((_, delta) => {
    if (!interactive || !upper.current) return;
    const current = state.current;
    if (!current.active) {
      if (!current.broken) upper.current.rotation.z = THREE.MathUtils.damp(upper.current.rotation.z,
        current.hover ? direction * 0.065 : 0, 12, delta);
      return;
    }
    current.elapsed += Math.min(delta, 0.05);
    if (current.elapsed < SNAP_TIME) {
      const progress = current.elapsed / SNAP_TIME;
      upper.current.rotation.z = direction * 0.28 * progress * progress;
      return;
    }
    if (placeDebris(upper.current, asset.supportGeometry, motion, current.elapsed - SNAP_TIME)) current.active = false;
  });

  return (
    <group position={position} name={name} dispose={null} onClick={snap}
      onPointerMove={(event) => {
        if (!interactive || state.current.broken) return;
        const hit = opaqueHit(event);
        if (hit) event.stopPropagation();
        if (hit || state.current.hover) document.body.style.cursor = hit ? 'pointer' : 'auto';
        state.current.hover = hit;
      }}
      onPointerOut={() => {
        if (state.current.hover) document.body.style.cursor = 'auto';
        state.current.hover = false;
      }}>
      <mesh geometry={asset.lower} material={asset.material} name={`${name}-stem`} />
      <group ref={upper} position={[0, height * SPLIT, 0]} name={`${name}-tip`}>
        <mesh geometry={asset.upper} material={asset.material} />
      </group>
    </group>
  );
}

function PlanterWall({ part, wood, paper }: { part: PlanterPart; wood: THREE.Texture; paper: THREE.Texture }) {
  const geometry = useMemo(() => new THREE.BoxGeometry(...part.size), [part.size]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  useEffect(() => () => { geometry.dispose(); edges.dispose(); }, [geometry, edges]);
  return (
    <group position={part.position} name={`planter-${part.name}`}>
      <mesh geometry={geometry} onClick={(event) => event.stopPropagation()}>
        <meshBasicMaterial map={part.soil ? paper : wood} color={part.soil ? '#92928a' : '#d8d8d6'} />
      </mesh>
      {!part.soil && <lineSegments geometry={edges} raycast={() => {}}>
        <lineBasicMaterial color="#575953" transparent opacity={0.7} />
      </lineSegments>}
    </group>
  );
}

/** Solid wooden troughs with individually breakable paper flowers and low succulent planting. */
export default function EntrancePlanters({ layout, colliders, textures, interactive, groundY }: EntrancePlantersProps) {
  const paper = useMemo(() => {
    const clone = textures.floorPaper.clone();
    clone.repeat.set(1, 1);
    clone.needsUpdate = true;
    return clone;
  }, [textures.floorPaper]);
  useEffect(() => () => paper.dispose(), [paper]);
  const flowers = [textures.gardenDaisy, textures.gardenTulip, textures.gardenCosmos, textures.gardenDaisy, textures.gardenTulip];
  const aloeImage = textures.gardenAloe.image as HTMLImageElement;
  return (
    <group name="entrance-planters">
      {layout.map((planter, side) => (
        <group key={planter.id} name={`planter-${planter.id}`}>
          {planter.parts.map((part) => <PlanterWall key={part.name} part={part} wood={textures.gardenWood} paper={paper} />)}
          {flowers.map((texture, index) => (
            <Flower key={index} name={`flower-${planter.id}-${index}`} index={index + side * 5}
              texture={texture} palette={FLOWER_PALETTES[index]} height={[0.61, 0.69, 0.64, 0.72, 0.57][index]}
              position={[planter.x + (index - 2) * 0.32, planter.soilY, planter.z - 0.11 + (index % 2) * 0.055]}
              interactive={interactive} groundY={groundY} colliders={colliders} soilBounds={planter.soilBounds} />
          ))}
          {[-0.61, -0.03, 0.59].map((offset, index) => {
            const height = 0.26 + (index % 2) * 0.045;
            return <mesh key={offset} position={[planter.x + offset, planter.soilY + height / 2, planter.z + 0.15]}
              rotation-y={(index - 1) * 0.16}>
              <planeGeometry args={[height * aloeImage.width / aloeImage.height, height]} />
              <meshBasicMaterial map={textures.gardenAloe} color="#aebe98" transparent alphaTest={0.35} side={THREE.DoubleSide} />
            </mesh>;
          })}
        </group>
      ))}
    </group>
  );
}
