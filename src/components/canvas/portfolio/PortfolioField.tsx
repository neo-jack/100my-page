import { useSceneTexture } from '../../../utils/useSceneTexture';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { PORTFOLIO_PROJECTS, type PortfolioPhase, type PortfolioProject } from '../../../data/note';
import type { RevealBasicMaterial } from '../../../shaders/RevealBasicMaterial';
import TechStackBalloons, { type PortfolioAppearance } from './TechStackBalloons';

const CARD_SPACING = 40;
const PERIOD = CARD_SPACING * Math.max(PORTFOLIO_PROJECTS.length, 1);
const ROOM_Z = -25;
// Like ref/About, reveal and passage are continuous functions of distance.
const FADE_START_DISTANCE = 32;
const FADE_END_DISTANCE = 18;
// Keep the first pair visible in the distance after the camera settles at z=-19.1.
const INITIAL_ROUTE_OFFSET = 18;
const SPREAD_START_DISTANCE = 14;
const SPREAD_END_DISTANCE = 3;
const SIDE_OFFSET = 2.8;
const SPREAD_DISTANCE = 12;
const CARD_WIDTH = 3.9;
const CARD_HEIGHT = 5.1;
const BUTTON_WIDTH = 2.9;
const BUTTON_HEIGHT = 0.46;
const BUTTON_Y = -2.06;
const DEFAULT_BUTTON_LAYOUT = { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, y: BUTTON_Y };
const BUTTON_LAYOUTS: Record<string, { width: number; height: number; y: number }> = {
  // 各生成卡面的按钮框存在少量像素差异，分别校正 UV 和平面尺寸。
  'A1react': { width: 2.88, height: 0.45, y: -2.01 },
  'A2design': { width: 2.93, height: 0.47, y: -2.05 },
  'A3context': { width: 2.92, height: 0.53, y: -1.95 },
};

interface CardHandle { group: THREE.Group; project: PortfolioProject; appearance: PortfolioAppearance }
interface FocusSession {
  card: CardHandle;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  cardQuaternion: THREE.Quaternion;
  opacity: number;
}
interface PortfolioFieldProps {
  scrollProgressRef: MutableRefObject<number>;
  lockedRef: MutableRefObject<boolean>;
  enabled: boolean;
  isReturningHome: boolean;
  selectedId: string | null;
  portfolioPhase: PortfolioPhase;
  onSelect: (id: string) => void;
  onPhaseChange: (phase: PortfolioPhase) => void;
}

export default function PortfolioField({ scrollProgressRef, lockedRef, enabled, isReturningHome, selectedId, portfolioPhase, onSelect, onPhaseChange }: PortfolioFieldProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const mobile = size.width < 768;
  const displayScale = mobile ? 0.56 : size.width < 1024 ? 0.82 : 1;
  const [cycle, setCycle] = useState(0);
  const cycles = useMemo(() => [cycle - 1, cycle, cycle + 1], [cycle]);
  const cards = useRef(new Map<string, CardHandle>());
  const session = useRef<FocusSession | null>(null);
  const phase = useRef<PortfolioPhase>('idle');
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const motion = useRef({ camera: 0, facing: 0 });
  const floatingTime = useRef(0);
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const worldScale = useMemo(() => new THREE.Vector3(), []);
  const straight = useMemo(() => new THREE.Quaternion(), []);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { reducedMotion.current = media.matches; };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  // A single timeline owns the camera until its exact saved transform is restored.
  useEffect(() => {
    if (!enabled || isReturningHome) {
      timeline.current?.kill();
      timeline.current = null;
      const saved = session.current;
      if (saved) {
        saved.card.group.quaternion.copy(saved.cardQuaternion);
        saved.card.appearance.opacity = saved.opacity;
      }
      session.current = null;
      phase.current = 'idle';
      lockedRef.current = false;
      // EntranceDoors restores the home camera; discard the old flight target.
      return;
    }
    const notify = (next: PortfolioPhase) => { phase.current = next; onPhaseChange(next); };
    if (selectedId && phase.current === 'idle') {
      let nearest: CardHandle | undefined;
      let nearestDistance = Infinity;
      cards.current.forEach((card) => {
        if (card.project.id !== selectedId || !card.group.visible) return;
        card.group.getWorldPosition(worldPosition);
        if (worldPosition.z >= camera.position.z - 1) return;
        const distance = worldPosition.distanceToSquared(camera.position);
        if (distance < nearestDistance) { nearest = card; nearestDistance = distance; }
      });
      if (!nearest) return;
      lockedRef.current = true;
      session.current = {
        card: nearest, position: camera.position.clone(), quaternion: camera.quaternion.clone(),
        cardQuaternion: nearest.group.quaternion.clone(),
        opacity: nearest.appearance.opacity,
      };
      motion.current.camera = 0;
      motion.current.facing = 0;
      notify('focusing');
      timeline.current?.kill();
      timeline.current = gsap.timeline({ onComplete: () => notify('open') })
        .to(motion.current, { facing: 1, duration: reducedMotion.current ? 0.01 : 0.45, ease: 'power2.inOut' })
        .to(motion.current, { camera: 1, duration: reducedMotion.current ? 0.01 : 0.75, ease: 'power2.inOut' }, '-=0.01');
    } else if (!selectedId && session.current && phase.current !== 'returning') {
      notify('returning');
      timeline.current?.kill();
      timeline.current = gsap.timeline({
        onComplete: () => {
          const saved = session.current;
          if (saved) {
            camera.position.copy(saved.position);
            camera.quaternion.copy(saved.quaternion);
            saved.card.group.quaternion.copy(saved.cardQuaternion);
            saved.card.appearance.opacity = saved.opacity;
          }
          session.current = null;
          lockedRef.current = false;
          notify('idle');
        },
      })
        .to(motion.current, { camera: 0, duration: reducedMotion.current ? 0.01 : 0.75, ease: 'power2.inOut' })
        .to(motion.current, { facing: 0, duration: reducedMotion.current ? 0.01 : 0.3, ease: 'power2.out' }, '-=0.01');
    }
  }, [selectedId, enabled, isReturningHome, camera, lockedRef, onPhaseChange, worldPosition]);

  useEffect(() => () => {
    timeline.current?.kill();
    const saved = session.current;
    if (saved) {
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
    }
    lockedRef.current = false;
  }, [camera, lockedRef]);

  useFrame((_state, delta) => {
    if (!lockedRef.current) {
      if (!reducedMotion.current) floatingTime.current += Math.min(delta, 0.05);
      const next = Math.floor(scrollProgressRef.current / PERIOD);
      if (next !== cycle) setCycle(next);
    }
    const saved = session.current;
    if (!saved) return;
    saved.card.group.quaternion.slerpQuaternions(saved.cardQuaternion, straight, motion.current.facing);
    saved.card.appearance.opacity = THREE.MathUtils.lerp(saved.opacity, 1, motion.current.facing);
    saved.card.group.getWorldPosition(worldPosition);
    // Keep the cover at the left on desktop, above the sheet on narrow screens.
    // Recompute from the live aspect ratio so resizing while open remains usable.
    const fraction = mobile ? 0.27 : 0.57;
    saved.card.group.getWorldScale(worldScale);
    const viewHeight = Math.max(CARD_HEIGHT * worldScale.y / fraction, CARD_WIDTH * worldScale.x / (mobile ? 0.72 : 0.36) / camera.aspect);
    const distance = viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    targetPosition.copy(worldPosition);
    targetPosition.z += distance;
    targetPosition.x += mobile ? 0 : viewHeight * camera.aspect * 0.255;
    targetPosition.y -= mobile ? viewHeight * 0.26 : 0;
    camera.position.lerpVectors(saved.position, targetPosition, motion.current.camera);
    camera.quaternion.slerpQuaternions(saved.quaternion, straight, motion.current.camera);
  }, -0.5);

  return (
    <group name="portfolio-field">
      {cycles.flatMap((cycleIndex) => PORTFOLIO_PROJECTS.map((project, index) => (
        <FloatingCard
          key={`${cycleIndex}:${project.id}`} project={project} index={index} cycle={cycleIndex}
          displayScale={displayScale}
          enabled={enabled} interactive={enabled && !isReturningHome} selectedId={selectedId} portfolioPhase={portfolioPhase} mobile={mobile} lockedRef={lockedRef} floatingTime={floatingTime}
          scrollProgressRef={scrollProgressRef} onSelect={onSelect}
          register={(handle) => {
            const key = `${cycleIndex}:${project.id}`;
            if (handle) cards.current.set(key, handle); else cards.current.delete(key);
          }}
        />
      )))}
    </group>
  );
}

interface FloatingCardProps {
  project: PortfolioProject;
  index: number;
  cycle: number;
  displayScale: number;
  enabled: boolean;
  interactive: boolean;
  selectedId: string | null;
  portfolioPhase: PortfolioPhase;
  mobile: boolean;
  lockedRef: MutableRefObject<boolean>;
  floatingTime: MutableRefObject<number>;
  scrollProgressRef: MutableRefObject<number>;
  register: (handle: CardHandle | null) => void;
  onSelect: (id: string) => void;
}

function FloatingCard({ project, index, cycle, displayScale, enabled, interactive, selectedId, portfolioPhase, mobile, lockedRef, floatingTime, scrollProgressRef, register, onSelect }: FloatingCardProps) {
  const pair = useRef<THREE.Group>(null);
  const stackGroup = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const visual = useRef<THREE.Group>(null);
  const sheet = useRef<THREE.Group>(null);
  const appearance = useRef<PortfolioAppearance>({ opacity: 0, spread: 0 });
  const originalOpacities = useMemo(() => new WeakMap<THREE.Material, number>(), []);
  const buttonReveal = useRef<RevealBasicMaterial>(null);
  const buttonLayout = BUTTON_LAYOUTS[project.id] ?? DEFAULT_BUTTON_LAYOUT;
  const [hovered, setHovered] = useState(false);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const cover = useSceneTexture(project.cover);
  // Sample the baked Chinese button from the same card so its hover reveal
  // preserves the lettering and paper without requiring a CJK font download.
  const button = useMemo(() => {
    const texture = cover.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(buttonLayout.width / CARD_WIDTH, buttonLayout.height / CARD_HEIGHT);
    texture.offset.set(
      (CARD_WIDTH - buttonLayout.width) / (2 * CARD_WIDTH),
      (CARD_HEIGHT / 2 + buttonLayout.y - buttonLayout.height / 2) / CARD_HEIGHT,
    );
    texture.needsUpdate = true;
    return texture;
  }, [buttonLayout, cover]);
  useEffect(() => { cover.colorSpace = THREE.SRGBColorSpace; }, [cover]);
  useEffect(() => () => { button.dispose(); }, [button]);
  useEffect(() => {
    if (group.current) register({ group: group.current, project, appearance: appearance.current });
    return () => register(null);
  }, [register, project]);
  useEffect(() => () => { gl.domElement.style.cursor = 'auto'; }, [gl]);
  useEffect(() => {
    if (!buttonReveal.current) return;
    const tween = gsap.to(buttonReveal.current, {
      uProgress: hovered ? 1 : 0,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : hovered ? 0.8 : 0.5,
      ease: 'power2.out',
    });
    return () => { tween.kill(); };
  }, [hovered]);

  // Fade the complete card and button together so an outline cannot remain.
  const fadeMaterial = (material: THREE.Material, opacity: number) => {
    let original = originalOpacities.get(material);
    if (original === undefined) {
      original = material.opacity;
      originalOpacities.set(material, original);
      if (!material.transparent) { material.transparent = true; material.needsUpdate = true; }
      material.depthWrite = false;
    }
    material.opacity = original * opacity;
  };
  const fadeObject = (object: THREE.Object3D) => {
    const opacity = appearance.current.opacity;
    const material = (object as THREE.Mesh).material;
    if (Array.isArray(material)) { for (const entry of material) fadeMaterial(entry, opacity); }
    else if (material) fadeMaterial(material, opacity);
  };

  const z = -(cycle * PERIOD + INITIAL_ROUTE_OFFSET + index * CARD_SPACING);
  const hideOnMobile = mobile && selectedId === project.id && portfolioPhase === 'open';
  useFrame((_state, delta) => {
    if (!pair.current || !stackGroup.current || !group.current || !visual.current || !sheet.current) return;
    if (!lockedRef.current) {
      const time = floatingTime.current;
      const routeDistance = camera.position.z - (ROOM_Z + z + scrollProgressRef.current);
      pair.current.position.z = z + scrollProgressRef.current;
      // The reference About scene squares distance progress to spread gently,
      // then faster near the camera. Keep each side at its original size.
      const progress = THREE.MathUtils.clamp((SPREAD_START_DISTANCE - routeDistance) / (SPREAD_START_DISTANCE - SPREAD_END_DISTANCE), 0, 1);
      appearance.current.spread = progress * progress;
      const spread = appearance.current.spread * SPREAD_DISTANCE;
      group.current.position.set(
        -SIDE_OFFSET - spread + Math.sin(time * 0.3 + index) * 0.035,
        Math.sin(time * 0.55 + index * 2) * 0.04,
        0,
      );
      stackGroup.current.position.x = SIDE_OFFSET + spread;
      const opacityTarget = enabled ? (1 - THREE.MathUtils.smoothstep(routeDistance, FADE_END_DISTANCE, FADE_START_DISTANCE)) * THREE.MathUtils.smoothstep(routeDistance, -2, 1) : 0;
      appearance.current.opacity = THREE.MathUtils.damp(appearance.current.opacity, opacityTarget, 8, Math.min(delta, 0.1));
      group.current.rotation.set(Math.sin(time * 0.4 + index) * 0.04, Math.sin(time * 0.25 + index) * 0.12, Math.sin(time * 0.38 + index) * 0.035);
    }
    // Once a mobile detail sheet opens, leave the viewport to the sheet instead
    // of keeping the focused cover stacked behind it. The card remains mounted
    // so the saved world position can still drive the focus and return camera.
    pair.current.visible = group.current.visible = !hideOnMobile && enabled && appearance.current.opacity > 0.002;
    sheet.current.traverse(fadeObject);
    const scale = hovered && !lockedRef.current ? 1.035 : 1;
    visual.current.scale.setScalar(THREE.MathUtils.damp(visual.current.scale.x, scale, 8, Math.min(delta, 0.1)));
  }, -1);

  const select = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || lockedRef.current || event.delta > 6 || appearance.current.opacity < 0.2) return;
    event.stopPropagation();
    setHovered(false);
    gl.domElement.style.cursor = 'auto';
    onSelect(project.id);
  };

  return (
    <group ref={pair} name={`portfolio-pair:${cycle}:${project.id}`} position={[0, 0.8, z]} scale={displayScale} visible={false}>
      <group ref={group} name={`portfolio-card:${cycle}:${project.id}`} position={[-SIDE_OFFSET, 0, 0]} scale={1} visible={false}
        onClick={select}>
        <group ref={visual}>
          <group ref={sheet} name="portfolio-sheet" scale={1} position={[0, 0, 0]}>
            <mesh renderOrder={1}>
              <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
              <meshBasicMaterial map={cover} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <mesh renderOrder={3} position={[0, buttonLayout.y, 0.023]}>
              <planeGeometry args={[buttonLayout.width, buttonLayout.height]} />
              <meshBasicMaterial map={button} color="#ecd5a6" transparent toneMapped={false} />
            </mesh>
            <mesh renderOrder={4} position={[0, buttonLayout.y, 0.025]}>
              <planeGeometry args={[buttonLayout.width, buttonLayout.height]} />
              <revealBasicMaterial ref={buttonReveal} map={button} transparent depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0.065]}
              onPointerOver={(event) => {
                if (!interactive || lockedRef.current) return;
                event.stopPropagation(); setHovered(true); gl.domElement.style.cursor = 'pointer';
              }}
              onPointerOut={() => { setHovered(false); gl.domElement.style.cursor = 'auto'; }}>
              <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>
      </group>
      <group ref={stackGroup} name={`portfolio-stack:${cycle}:${project.id}`} position={[SIDE_OFFSET, 0, 0]}>
        <TechStackBalloons technologies={project.balloons} appearance={appearance.current}
          timeRef={floatingTime} lockedRef={lockedRef} enabled={interactive} />
      </group>
    </group>
  );
}
