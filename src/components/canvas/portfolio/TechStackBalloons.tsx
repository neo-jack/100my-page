import { useSceneTexture } from '../../../utils/useSceneTexture';
import assetCabinSketchBold from '../../../../public/fonts/CabinSketch-Bold.ttf?url';
import assetRubikScribbleRegular from '../../../../public/fonts/RubikScribble-Regular.ttf?url';
import balloonPopUrl from '../../../../public/sounds/paper-pop.mp3?url';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { PositionalAudio, Text } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { TECHNOLOGY_BALLOONS, type TechnologyKey } from '../../../data/technologyBalloons';
import { useAudio } from '../../../context/AudioManager';
import { isTouchDevice } from '../../../utils/deviceDetect';
import type { RevealBasicMaterial } from '../../../shaders/RevealBasicMaterial';
import { createBalloonRaycast } from './balloonRaycast';

export interface PortfolioAppearance { opacity: number; spread: number }
interface Props {
  technologies: TechnologyKey[];
  appearance: PortfolioAppearance;
  timeRef: MutableRefObject<number>;
  lockedRef: MutableRefObject<boolean>;
  enabled: boolean;
}

const BALLOON_LAYOUT = [
  { x: -0.95, y: 0.2, height: 3.1, phase: 0.3 },
  { x: 0.95, y: 0.75, height: 2.8, phase: 2.2 },
  { x: 0.1, y: -1.15, height: 2.3, phase: 4.1 },
];

export default function TechStackBalloons({ technologies, appearance, timeRef, lockedRef, enabled }: Props) {
  const title = useRef<THREE.Object3D & { fillOpacity: number }>(null);
  const sound = useRef<THREE.PositionalAudio>(null);
  const { isMuted, globalVolume } = useAudio();

  const playPop = () => {
    if (!sound.current || isMuted) return;
    sound.current.setVolume(Math.min(1, Math.max(0, Number.isFinite(globalVolume) ? globalVolume : 0.5)));
    if (sound.current.isPlaying) sound.current.stop();
    sound.current.play();
  };

  useFrame(() => { if (title.current) title.current.fillOpacity = appearance.opacity; });

  return (
    <group name="technology-balloons">
      <Text ref={title} position={[0, 2.45, 0]} font={assetCabinSketchBold} fontSize={0.36} color="#45483d" fillOpacity={0}>
        TECH STACK
      </Text>
      {technologies.map((technology, index) => (
        <TechnologyBalloon key={technology} technology={technology} index={index}
          appearance={appearance} timeRef={timeRef} lockedRef={lockedRef} enabled={enabled} onPop={playPop} />
      ))}
      <PositionalAudio ref={sound} url={balloonPopUrl} distance={2} loop={false}
        onUpdate={(audio) => { audio.setRolloffFactor(2); audio.setDistanceModel('exponential'); }} />
    </group>
  );
}

interface BalloonProps extends Omit<Props, 'technologies'> {
  technology: TechnologyKey;
  index: number;
  onPop: () => void;
}

function TechnologyBalloon({ technology, index, appearance, timeRef, lockedRef, enabled, onPop }: BalloonProps) {
  const config = TECHNOLOGY_BALLOONS[technology];
  const layout = BALLOON_LAYOUT[index % BALLOON_LAYOUT.length];
  const touch = isTouchDevice();
  const [sketch, painted] = useSceneTexture([
    config.sketch,
    touch ? config.sketch : config.painted,
  ]);
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const reveal = useRef<RevealBasicMaterial>(null);
  const paintedMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const label = useRef<THREE.Object3D & { fillOpacity: number; outlineOpacity: number }>(null);
  const gl = useThree((state) => state.gl);
  const pointerLocal = useMemo(() => new THREE.Vector3(), []);
  const magnet = useMemo(() => new THREE.Vector2(), []);
  const targetMagnet = useMemo(() => new THREE.Vector2(), []);
  const hovered = useRef(false);
  const popping = useRef(false);
  const hoverScale = useRef(1);
  const animation = useRef({ pop: 0, labelOpacity: 0, respawn: 0 });
  const popTimeline = useRef<gsap.core.Timeline | null>(null);
  const paintTween = useRef<gsap.core.Tween | null>(null);
  const raycast = useMemo(() => createBalloonRaycast(sketch,
    () => enabled && !lockedRef.current && appearance.opacity > 0.2 && !popping.current,
  ), [sketch, enabled, lockedRef, appearance]);

  useEffect(() => {
    sketch.colorSpace = painted.colorSpace = THREE.SRGBColorSpace;
  }, [sketch, painted]);
  useEffect(() => () => {
    popTimeline.current?.kill();
    paintTween.current?.kill();
    gl.domElement.style.cursor = 'auto';
  }, [gl]);

  const interactive = () => enabled && !lockedRef.current && appearance.opacity > 0.2 && !popping.current;
  const setPaint = (value: number) => {
    if (!reveal.current) return;
    paintTween.current?.kill();
    paintTween.current = gsap.to(reveal.current, {
      uProgress: value,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : value ? 0.78 : 0.48,
      ease: 'power2.out',
    });
  };
  const leave = () => {
    hovered.current = false;
    targetMagnet.set(0, 0);
    gl.domElement.style.cursor = 'auto';
    setPaint(0);
  };
  const pop = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive() || event.delta > 6) return;
    event.stopPropagation();
    popping.current = true;
    leave();
    onPop();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    popTimeline.current?.kill();
    popTimeline.current = gsap.timeline()
      .to(animation.current, { pop: 1, duration: reduce ? 0.05 : 0.5, ease: 'power2.out' })
      .to(animation.current, { labelOpacity: 1, duration: 0.2 }, '<')
      .to(animation.current, { labelOpacity: 0, duration: 0.5 }, '+=2.4')
      .call(() => {
        animation.current.pop = 0;
        animation.current.respawn = reduce ? 0 : -4;
        popping.current = false;
        if (reveal.current) reveal.current.uProgress = 0;
      })
      .to(animation.current, { respawn: 0, duration: reduce ? 0.05 : 1.5, ease: 'power2.out' });
  };

  useFrame((_state, delta) => {
    if (!outer.current || !inner.current || !body.current) return;
    if (hovered.current && !interactive()) leave();
    const dt = Math.min(delta, 0.1);
    const time = timeRef.current;
    const swayPhase = time * 0.41 + layout.phase * 0.73;
    const floatX = (Math.sin(swayPhase) + 0.025 * Math.sin(2 * swayPhase)) * 0.145;
    const floatY = Math.sin(time * 0.59 + layout.phase + 0.025 * Math.sin(swayPhase)) * 0.29;
    // 轻微复合摆动；暂停作品浏览时仍由 timeRef 统一冻结。
    outer.current.position.set(
      layout.x + floatX + appearance.spread * index * 0.5,
      layout.y - (1 - appearance.opacity) * 4 + floatY + animation.current.respawn,
      index * -0.12,
    );
    outer.current.rotation.z = Math.sin(time * 0.31 + layout.phase * 0.98) * 0.077;
    hoverScale.current = THREE.MathUtils.damp(hoverScale.current, hovered.current && !popping.current ? 1.048 : 1, 8, dt);
    magnet.x = THREE.MathUtils.damp(magnet.x, targetMagnet.x, 8, dt);
    magnet.y = THREE.MathUtils.damp(magnet.y, targetMagnet.y, 8, dt);
    inner.current.position.set(magnet.x, magnet.y, 0);
    body.current.scale.setScalar(Math.max(0.001, (0.85 + appearance.opacity * 0.15) * (hoverScale.current + animation.current.pop * 0.38)));
    body.current.visible = animation.current.pop < 0.999;
    const alpha = appearance.opacity * (1 - animation.current.pop);
    if (reveal.current) reveal.current.opacity = alpha;
    if (paintedMaterial.current) paintedMaterial.current.opacity = (reveal.current && reveal.current.uProgress > 0.001 ? alpha : 0);
    if (label.current) {
      label.current.fillOpacity = appearance.opacity * animation.current.labelOpacity;
      label.current.outlineOpacity = appearance.opacity * animation.current.labelOpacity;
    }
  });

  return (
    <group ref={outer} name={`technology-balloon:${technology}`}>
      <group ref={inner}>
        <group ref={body}>
          <mesh renderOrder={2}>
            <planeGeometry args={[layout.height * config.aspect, layout.height]} />
            <meshBasicMaterial ref={paintedMaterial} map={painted} color="#e0e0e0" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.01]} renderOrder={3} raycast={raycast} onClick={pop}
            onPointerOver={(event) => {
              if (!interactive() || touch) return;
              event.stopPropagation();
              hovered.current = true;
              gl.domElement.style.cursor = 'pointer';
              setPaint(1);
            }}
            onPointerOut={leave}
            onPointerMove={(event) => {
              if (!interactive() || !hovered.current || !outer.current) return;
              event.stopPropagation();
              pointerLocal.copy(event.point);
              outer.current.worldToLocal(pointerLocal);
              targetMagnet.set(THREE.MathUtils.clamp(pointerLocal.x * 0.145, -0.145, 0.145), THREE.MathUtils.clamp(pointerLocal.y * 0.145, -0.145, 0.145));
            }}>
            <planeGeometry args={[layout.height * config.aspect, layout.height]} />
            <revealBasicMaterial ref={reveal} map={sketch} color="#e0e0e0" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <Text ref={label} position={[0, 0.5, 0.1]} font={assetRubikScribbleRegular} fontSize={0.38}
          color="#333a31" fillOpacity={0} outlineOpacity={0} outlineWidth={0.012} outlineColor="#fff" renderOrder={5}>
          {config.label}
        </Text>
      </group>
    </group>
  );
}
