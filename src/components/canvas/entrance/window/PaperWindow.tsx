import { useEffect, useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { copyWindowShard, createWindowShards, fractureWindow, type WindowShard } from './windowFracture';
import { createSketchStone } from './sketchStone';
import { createLandingMotion, placeDebris, prepareLanding, type LandingMotion } from '../shared/windowDebris';

interface PaperWindowProps {
  ref?: Ref<PaperWindowHandle>;
  sketch: THREE.Texture;
  glass: THREE.Texture;
  paper: THREE.Texture;
  interactive: boolean;
  groundY: number;
  colliders: readonly THREE.Box3[];
}

export interface PaperWindowHandle { breakGlass: () => 'started' | 'exhausted' | 'unavailable' }

// Pixel apertures in the 1024-square reference crop, shared by glass UVs and hit bounds.
const PANES = [[104, 105, 915, 341], [102, 444, 470, 910], [564, 444, 916, 910]].map(([left, top, right, bottom]) => ({
  position: [((left + right) / 2048 - 0.5) * 1.5, (0.5 - (top + bottom) / 2048) * 1.5, 0.015] as [number, number, number],
  size: [(right - left) / 1024 * 1.5, (bottom - top) / 1024 * 1.5] as [number, number],
  uv: [left / 1024, 1 - bottom / 1024, (right - left) / 1024, (bottom - top) / 1024],
}));
const CONTACT = 0.24;
const PANE_OVERLAP = 1.5 * 4 / 1024;

function fragmentMaterials(paper: THREE.Texture) {
  return {
    front: new THREE.MeshBasicMaterial({ map: paper, color: '#e3e3e3', transparent: true, depthWrite: false, opacity: 0.92, toneMapped: false }),
    back: new THREE.MeshBasicMaterial({ map: paper, color: '#eeeeee', transparent: true, depthWrite: false, side: THREE.BackSide, toneMapped: false }),
    edge: new THREE.LineBasicMaterial({ color: '#555953', transparent: true, depthWrite: false, opacity: 0.6 }),
  };
}

interface Damage {
  broken: boolean;
  shards: WindowShard[];
  pane: THREE.Mesh | null;
  rim: THREE.Group | null;
  pieces: (THREE.Group | null)[];
}

interface Impact {
  started: boolean;
  active: boolean;
  contacted: boolean;
  reduced: boolean;
  elapsed: number;
  pane: number;
  start: THREE.Vector3;
  hit: THREE.Vector3;
  shards: WindowShard[];
  pieces: (THREE.Group | null)[];
  fragments: THREE.Group | null;
  projectile: THREE.Group | null;
  shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> | null;
  stoneMotion: LandingMotion;
  shardMotions: LandingMotion[];
  materials: ReturnType<typeof fragmentMaterials>;
}

// Each pane accepts one throw and keeps its rim and fallen debris until page reload.
function contactImpact(impact: Impact, damage: Damage) {
  if (impact.contacted) return;
  impact.contacted = true;
  if (damage.broken) return;
  damage.broken = true;
  if (damage.pane) damage.pane.visible = false;
  if (damage.rim) damage.rim.visible = true;
  damage.shards.forEach((shard, i) => {
    copyWindowShard(shard, impact.shards[i * 3 + 2]);
    const piece = damage.pieces[i];
    if (!piece) return;
    piece.position.copy(shard.center);
    piece.position.z += 0.005;
    piece.rotation.set(Math.sin(i * 2.3) * 0.3, Math.cos(i * 1.7) * 0.3, 0);
  });
}

function placeImpactDebris(impact: Impact, stoneGeometry: THREE.BufferGeometry, time: number) {
  let settled = true;
  if (impact.projectile) {
    impact.projectile.visible = true;
    settled = placeDebris(impact.projectile, stoneGeometry, impact.stoneMotion, time);
    if (impact.shadow) {
      const height = impact.projectile.position.y - impact.stoneMotion.surfaceY;
      impact.shadow.visible = true;
      impact.shadow.position.set(impact.projectile.position.x, impact.stoneMotion.surfaceY + 0.001, impact.projectile.position.z);
      impact.shadow.material.opacity = 0.16 * (1 - THREE.MathUtils.smoothstep(height, 0.09, 0.8));
    }
  }
  if (impact.fragments) impact.fragments.visible = true;
  impact.shards.forEach((shard, i) => {
    const piece = impact.pieces[i];
    if (!piece) return;
    const finished = placeDebris(piece, shard.geometry, impact.shardMotions[i], Math.max(0, time - 0.085 - shard.delay));
    settled = settled && finished;
  });
  return settled;
}

function Shard({ shard, materials }: { shard: WindowShard; materials: ReturnType<typeof fragmentMaterials> }) {
  return (
    <>
      <mesh geometry={shard.geometry} material={materials.front} />
      <mesh geometry={shard.geometry} material={materials.back} />
      <lineLoop geometry={shard.outline} material={materials.edge} />
    </>
  );
}

/** Three one-shot panes own their persistent stones, shards and window damage. */
export default function PaperWindow({ ref, sketch, glass, paper, interactive, groundY, colliders }: PaperWindowProps) {
  const root = useRef<THREE.Group>(null);
  const frame = useRef<THREE.Mesh>(null);
  const camera = useThree((state) => state.camera);
  const paperMap = useMemo(() => {
    const texture = paper.clone();
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
    texture.needsUpdate = true;
    return texture;
  }, [paper]);
  const paneMaps = useMemo(() => PANES.map(({ uv }) => {
    const texture = glass.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.offset.set(uv[0], uv[1]);
    texture.repeat.set(uv[2], uv[3]);
    texture.needsUpdate = true;
    return texture;
  }), [glass]);
  const stone = useMemo(() => createSketchStone(paperMap), [paperMap]);
  const impacts = useMemo<Impact[]>(() => PANES.map(({ size }, pane) => {
    const shards = createWindowShards();
    fractureWindow(shards, 0, 0, 31, size);
    return {
      started: false, active: false, contacted: false, reduced: false, elapsed: 0, pane,
      start: new THREE.Vector3(), hit: new THREE.Vector3(), shards, pieces: [],
      fragments: null, projectile: null, shadow: null, materials: fragmentMaterials(paneMaps[pane]),
      stoneMotion: createLandingMotion(), shardMotions: shards.map(createLandingMotion),
    };
  }), [paneMaps]);
  const damage = useMemo<Damage[]>(() => PANES.map((_, pane) => {
    const shards = createWindowShards(16);
    shards.forEach((shard, i) => copyWindowShard(shard, impacts[pane].shards[i * 3 + 2]));
    return { broken: false, shards, pane: null, rim: null, pieces: [] };
  }), [impacts]);

  useEffect(() => {
    if (!interactive) {
      impacts.forEach((impact) => {
        if (!impact.active) return;
        contactImpact(impact, damage[impact.pane]);
        placeImpactDebris(impact, stone.geometry, Infinity);
        impact.active = false;
      });
      if (frame.current) frame.current.rotation.set(0, 0, 0);
    }
  }, [interactive, impacts, damage, stone]);

  useEffect(() => () => {
    [...impacts, ...damage].forEach(({ shards }) => {
      shards.forEach(({ geometry, outline }) => { geometry.dispose(); outline.dispose(); });
    });
    impacts.forEach(({ materials }) => Object.values(materials).forEach((material) => material.dispose()));
    paneMaps.forEach((texture) => texture.dispose());
    stone.dispose();
    paperMap.dispose();
  }, [impacts, damage, paneMaps, stone, paperMap]);

  const launchStone = (paneIndex: number, hit: THREE.Vector3) => {
    if (!interactive || !root.current || paneIndex < 0) return;
    const impact = impacts[paneIndex];
    // Reserve at launch, so fast clicks cannot queue extra stones before contact.
    if (impact.started || damage[paneIndex].broken) return;
    const { position: [px, py, pz], size } = PANES[paneIndex];
    const localX = THREE.MathUtils.clamp(hit.x - px, -size[0] / 2 + 0.035, size[0] / 2 - 0.035);
    const localY = THREE.MathUtils.clamp(hit.y - py, -size[1] / 2 + 0.035, size[1] / 2 - 0.035);
    impact.started = true;
    impact.elapsed = 0;
    impact.contacted = false;
    impact.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    impact.active = true;
    fractureWindow(impact.shards, localX, localY, 31 + paneIndex * 137, size);
    impact.fragments?.position.set(px, py, pz + 0.008);
    impact.hit.set(px + localX, py + localY, 0.1);
    root.current.worldToLocal(impact.start.copy(camera.position));
    impact.start.lerp(impact.hit, 0.48);
    impact.start.y -= 0.3;
    const rotation = new THREE.Euler();
    const motion = impact.stoneMotion;
    motion.origin.copy(impact.hit);
    motion.velocity.set(px * 0.9, 0.6, 1.5 + paneIndex * 0.14);
    motion.spin.set(4, 3, 5);
    motion.rest.setFromEuler(rotation.set(0, paneIndex * 1.4, 0));
    motion.groundY = groundY;
    motion.offset.set(2.5, 0, 0.16);
    motion.supportScale = 1.018;
    prepareLanding(motion, stone.geometry, 0.18, colliders);
    impact.shards.forEach((shard, i) => {
      if (shard.retained) return;
      const flight = impact.shardMotions[i];
      flight.origin.copy(shard.center);
      // Keep debris on the paper floor beneath the window, clear of the raised doorway path.
      flight.velocity.set(Math.max(shard.velocity.x * 0.4, (-0.9 - px - shard.center.x) / 0.9),
        shard.velocity.y * 0.7, shard.velocity.z);
      flight.spin.copy(shard.spin);
      flight.rest.setFromEuler(rotation.set(-Math.PI / 2, 0, i * 2.4 + paneIndex));
      flight.groundY = groundY - py + (i % 3) * 0.001;
      flight.offset.set(2.5 + px, py, 0.16 + pz + 0.008);
      prepareLanding(flight, shard.geometry, 0.055, colliders);
    });
    if (impact.reduced) {
      contactImpact(impact, damage[paneIndex]);
      placeImpactDebris(impact, stone.geometry, Infinity);
      impact.active = false;
    }
  };

  const throwStone = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || event.delta > 6 || !root.current) return;
    event.stopPropagation();
    const hit = root.current.worldToLocal(event.point.clone());
    const paneIndex = PANES.findIndex(({ position: [x, y], size: [width, height] }) =>
      Math.abs(hit.x - x) <= width / 2 && Math.abs(hit.y - y) <= height / 2);
    launchStone(paneIndex, hit);
  };

  useImperativeHandle(ref, () => ({
    breakGlass() {
      if (!interactive || !root.current) return 'unavailable';
      const paneIndex = impacts.findIndex((impact, index) => !impact.started && !damage[index].broken);
      if (paneIndex < 0) return 'exhausted';
      launchStone(paneIndex, new THREE.Vector3(...PANES[paneIndex].position));
      return 'started';
    },
  }));

  useFrame((_, delta) => {
    if (!interactive) return;
    let shakeZ = 0;
    let shakeY = 0;
    impacts.forEach((impact) => {
      if (!impact.active) return;
      impact.elapsed += Math.min(delta, 0.05);
      const time = impact.elapsed - CONTACT;
      if (time < 0) {
        if (impact.projectile) {
          impact.projectile.visible = true;
          const t = impact.elapsed / CONTACT;
          impact.projectile.position.lerpVectors(impact.start, impact.hit, t);
          impact.projectile.position.y += Math.sin(t * Math.PI) * 0.12;
          impact.projectile.rotation.set(impact.elapsed * 4, impact.elapsed * 3, impact.elapsed * 5);
        }
        return;
      }
      contactImpact(impact, damage[impact.pane]);
      shakeZ += Math.sin(time * 65) * Math.exp(-time * 13) * 0.022;
      shakeY += Math.sin(time * 49) * Math.exp(-time * 12) * 0.03;
      if (placeImpactDebris(impact, stone.geometry, time)) impact.active = false;
    });
    if (frame.current) {
      frame.current.rotation.z = THREE.MathUtils.clamp(shakeZ, -0.05, 0.05);
      frame.current.rotation.y = THREE.MathUtils.clamp(shakeY, -0.06, 0.06);
    }
  });

  return (
    <group ref={root} name="paper-window" position={[2.5, 0, 0.16]}>
      {damage.map((entry, i) => (
        <group key={i} position={PANES[i].position}>
          <mesh ref={(mesh) => { entry.pane = mesh; }} visible={!entry.broken} name={`window-pane-${i}`}>
            <planeGeometry args={[PANES[i].size[0] + PANE_OVERLAP * 2, PANES[i].size[1] + PANE_OVERLAP * 2]} />
            <meshBasicMaterial map={paneMaps[i]} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <group ref={(group) => { entry.rim = group; }} visible={entry.broken} name={`window-damage-${i}`}>
            <mesh position={[0, 0, -0.008]}>
              <planeGeometry args={[PANES[i].size[0] + PANE_OVERLAP * 2, PANES[i].size[1] + PANE_OVERLAP * 2]} />
              <meshBasicMaterial map={paperMap} color="#666666" />
            </mesh>
            {entry.shards.map((shard, j) => (
              <group key={j} ref={(group) => { entry.pieces[j] = group; }} position-z={0.008}>
                <Shard shard={shard} materials={impacts[i].materials} />
              </group>
            ))}
          </group>
        </group>
      ))}
      <mesh ref={frame} position={[0, 0, 0.02]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial color="#f5f5f5" map={sketch} transparent alphaTest={0.01} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {impacts.map((impact, slot) => (
        <group key={slot}>
          <mesh ref={(mesh) => { impact.shadow = mesh as typeof impact.shadow; }} visible={false}
            rotation={[-Math.PI / 2, 0, 0]} scale={[1.35, 1, 1]}>
            <circleGeometry args={[0.12, 20]} />
            <meshBasicMaterial color="#55534d" transparent opacity={0} depthWrite={false} />
          </mesh>
          <group ref={(group) => { impact.fragments = group; }} visible={false} name={`window-fragments-${slot}`}>
            {impact.shards.map((shard, i) => shard.retained ? null : (
              <group key={i} ref={(group) => { impact.pieces[i] = group; }}>
                <Shard shard={shard} materials={impact.materials} />
              </group>
            ))}
          </group>
          <group ref={(group) => { impact.projectile = group; }} visible={false} name={`window-stone-${slot}`}>
            <mesh geometry={stone.geometry} material={stone.outlineMaterial} scale={1.018} />
            <mesh geometry={stone.geometry} material={stone.material} />
            <lineSegments geometry={stone.edges} material={stone.edgeMaterial} />
          </group>
        </group>
      ))}
      <mesh position={[0, 0, 0.04]} name="window-hit-target" onClick={throwStone}
        onPointerOver={(event) => {
          if (!interactive) return;
          event.stopPropagation();
        }}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
