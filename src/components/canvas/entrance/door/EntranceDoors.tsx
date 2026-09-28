import { useSceneTexture } from '../../../../utils/useSceneTexture';
import assetDoorBack from '../../../../../public/textures/doors/door_back.webp?url';
import assetDoorLeftSketch from '../../../../../public/textures/doors/door_left_sketch.webp?url';
import assetDoorRightSketch from '../../../../../public/textures/doors/door_right_sketch.webp?url';
import assetFrameSketch from '../../../../../public/textures/doors/frame_sketch.webp?url';
import assetHandleLeftSketch from '../../../../../public/textures/doors/handle_left_sketch.webp?url';
import assetHandleRightSketch from '../../../../../public/textures/doors/handle_right_sketch.webp?url';
import doorEdgeUrl from '../../../../../public/textures/doors/pien_sketch.webp?url';
import assetFloorPaper from '../../../../../public/textures/entrance/floor_paper.webp?url';
import assetGroundPaper from '../../../../../public/textures/entrance/ground-paper.webp?url';
import assetGardenAloe from '../../../../../public/textures/entrance/garden-aloe.webp?url';
import assetGardenCosmos from '../../../../../public/textures/entrance/garden-cosmos.webp?url';
import assetGardenDaisy from '../../../../../public/textures/entrance/garden-daisy.webp?url';
import assetGardenTulip from '../../../../../public/textures/entrance/garden-tulip.webp?url';
import assetGardenWood from '../../../../../public/textures/entrance/garden-wood.webp?url';
import assetStonePath from '../../../../../public/textures/entrance/stone-path.webp?url';
import assetWindowSketch from '../../../../../public/textures/entrance/window_sketch.webp?url';
import assetWindowGlass from '../../../../../public/textures/entrance/window_glass.webp?url';
import { useEffect, useRef, useState, useMemo, type ReactNode, type RefObject } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import EntranceWall from '../wall/EntranceWall';
import PaperWindow, { type PaperWindowHandle } from '../window/PaperWindow';
import EntrancePlanters from '../planter/EntrancePlanters';
import { PaperPet } from '@my-page/ai-pet/three';
import type { PaperPetMode } from '@my-page/ai-pet';
import { createPlanterColliders, createPlanterLayout } from '../planter/planterLayout';
import { createPavingEdgeMap, mapPavingX } from '../ground/pavingSurface';

interface EntranceDoorsProps {
  position?: [number, number, number];
  corridorHeight?: number;
  corridorWidth?: number;
  onEnterStart?: () => void;
  onEnter?: () => void;
  isReturningHome?: boolean;
  onReturnHomeComplete?: () => void;
  enabled?: boolean;
  canEnter?: boolean;
  introductionBoard?: ReactNode;
  petMode: PaperPetMode;
  petVisible: boolean;
  petPanelOpen: boolean;
  onPetWake: () => void;
  petTrigger: ReactNode;
  petReply: ReactNode;
  petGreeting: ReactNode;
  windowRef: RefObject<PaperWindowHandle | null>;
  petReplyPortal: RefObject<HTMLDivElement | null>;
}

const COLOR_TEXTURE_PATHS = new Set([assetGardenAloe, assetGardenCosmos, assetGardenDaisy, assetGardenTulip, assetGardenWood,
  assetDoorBack, assetDoorLeftSketch, assetDoorRightSketch, assetFrameSketch, assetHandleLeftSketch,
  assetHandleRightSketch, doorEdgeUrl, assetWindowSketch, assetWindowGlass, assetStonePath, assetGroundPaper]
  .map((url) => new URL(url, window.location.href).href));
const STONE_PATH_TEXTURE_URL = new URL(assetStonePath, window.location.href).href;

const configureColorTextures = (loaded: THREE.Texture | THREE.Texture[] | Record<string, THREE.Texture>, anisotropy: number) => {
  const list = loaded instanceof THREE.Texture ? [loaded] : Object.values(loaded);
  for (const texture of list) {
    const image = texture.image as HTMLImageElement;
    // The grazing-angle paving needs more directional samples than upright sketches.
    texture.anisotropy = image.src === STONE_PATH_TEXTURE_URL ? anisotropy : Math.min(8, anisotropy);
    if (COLOR_TEXTURE_PATHS.has(image.src) && texture.colorSpace !== THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }
};

/**
 * 入口门组件 - 简化版展示组件
 * 保留核心视觉元素：门、地板、石头路和门洞墙。
 */
const EntranceDoors: React.FC<EntranceDoorsProps> = ({
  position = [0, 0, 22],
  corridorHeight = 8,
  corridorWidth = 24,
  onEnterStart,
  onEnter,
  isReturningHome = false,
  onReturnHomeComplete,
  enabled = true,
  canEnter = true,
  introductionBoard,
  petMode,
  petVisible,
  petPanelOpen,
  onPetWake,
  petTrigger,
  petReply,
  petGreeting,
  windowRef,
  petReplyPortal,
}) => {
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [isOpen, setIsOpen] = useState(false);
  const camera = useThree((state) => state.camera);
  const anisotropy = useThree((state) => Math.min(16, state.gl.capabilities.getMaxAnisotropy()));
  const aspect = useThree((state) => state.size.width / state.size.height);
  const isMobile = useThree((state) => state.size.width <= 600);
  const entranceCamera = useMemo(() => ({ position: camera.position.clone(), quaternion: camera.quaternion.clone() }), [camera]);
  const entryTimeline = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const leftDoor = leftDoorRef.current;
    const rightDoor = rightDoorRef.current;
    if (enabled && !isReturningHome) {
      setIsOpen(false);
      if (leftDoor) leftDoor.rotation.y = 0;
      if (rightDoor) rightDoor.rotation.y = 0;
      camera.position.copy(entranceCamera.position);
      camera.quaternion.copy(entranceCamera.quaternion);
      document.body.style.cursor = 'auto';
    }
    return () => {
      entryTimeline.current?.kill();
      entryTimeline.current = null;
      if (leftDoor) gsap.killTweensOf(leftDoor.rotation);
      if (rightDoor) gsap.killTweensOf(rightDoor.rotation);
    };
  }, [enabled, isReturningHome, camera, entranceCamera]);

  const entranceZ = position[2];
  const entranceFrameWidth = isMobile ? 3.8 : 7.4;
  const fittedDistance = camera instanceof THREE.PerspectiveCamera
    ? Math.max(entranceCamera.position.z - entranceZ,
      entranceFrameWidth / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect) + 1)
    : entranceCamera.position.z - entranceZ;
  const extraGround = Math.max(0, fittedDistance - (entranceCamera.position.z - entranceZ));
  const groundLength = 7.25 + extraGround;
  useEffect(() => {
    if (!enabled || isOpen || isReturningHome || !(camera instanceof THREE.PerspectiveCamera)) return;
    // Frame the door more closely on mobile; never touch an entering/About camera.
    camera.position.z = entranceZ + fittedDistance;
  }, [camera, enabled, entranceZ, fittedDistance, isOpen, isReturningHome]);

  useEffect(() => {
    if (!isReturningHome) return;
    // Take over the live camera, including an interrupted portfolio focus.
    // Keep the doors open until the camera has backed out through the entrance.
    const startQuaternion = camera.quaternion.clone();
    const motion = { progress: 0 };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const retreatDuration = reducedMotion ? 0.01 : 1.84;
    const closeDuration = reducedMotion ? 0.01 : 0.65;
    document.body.style.cursor = 'auto';
    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(false);
        onReturnHomeComplete?.();
      },
    });
    entryTimeline.current = tl;
    tl.to(camera.position, {
      x: entranceCamera.position.x,
      y: entranceCamera.position.y,
      z: entranceZ + fittedDistance,
      duration: retreatDuration,
      ease: 'power2.inOut',
    }, 0);
    tl.to(motion, {
      progress: 1,
      duration: retreatDuration,
      ease: 'power2.inOut',
      onUpdate: () => camera.quaternion.slerpQuaternions(startQuaternion, entranceCamera.quaternion, motion.progress),
    }, 0);
    if (leftDoorRef.current) {
      tl.to(leftDoorRef.current.rotation, { y: 0, duration: closeDuration, ease: 'power2.out' }, retreatDuration);
    }
    if (rightDoorRef.current) {
      tl.to(rightDoorRef.current.rotation, { y: 0, duration: closeDuration, ease: 'power2.out' }, retreatDuration);
    }
    return () => { tl.kill(); };
  }, [camera, entranceCamera, entranceZ, fittedDistance, isReturningHome, onReturnHomeComplete]);

  // 入口资源在同一个 Suspense 边界批量加载，花坛一并参与首屏预热。
  const textures = useSceneTexture({
    frame: assetFrameSketch,
    doorLeft: assetDoorLeftSketch,
    doorRight: assetDoorRightSketch,
    doorBack: assetDoorBack,
    edge: doorEdgeUrl,
    handleLeft: assetHandleLeftSketch,
    handleRight: assetHandleRightSketch,
    windowSketch: assetWindowSketch,
    windowGlass: assetWindowGlass,
    stonePath: assetStonePath,
    floorPaper: assetFloorPaper,
    groundPaper: assetGroundPaper,
    gardenWood: assetGardenWood,
    gardenDaisy: assetGardenDaisy,
    gardenCosmos: assetGardenCosmos,
    gardenTulip: assetGardenTulip,
    gardenAloe: assetGardenAloe,
  }, (loaded) => configureColorTextures(loaded, anisotropy));

  const {
    frame: frameTexture,
    doorLeft: doorLeftTexture,
    doorRight: doorRightTexture,
    doorBack: doorBackTexture,
    edge: edgeTexture,
    handleLeft: handleLeftTexture,
    handleRight: handleRightTexture,
    windowSketch: windowSketchTexture,
    windowGlass: windowGlassTexture,
    stonePath: stonePathTexture,
    floorPaper: floorPaperTexture,
  } = textures;

  // 地面独立克隆平铺，不改变宠物、石头和 DOM 纸条的共享底纸。
  const groundMap = useMemo(() => {
    const texture = textures.groundPaper.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(25 / 2.5, groundLength / 2.5);
    texture.anisotropy = anisotropy;
    texture.needsUpdate = true;
    return texture;
  }, [textures.groundPaper, groundLength, anisotropy]);
  useEffect(() => () => groundMap.dispose(), [groundMap]);

  // 缓存门尺寸计算，避免每次渲染重复计算
  const dimensions = useMemo(() => {
    const doorWidth = 0.94;
    const doorHeight = 2.4;
    const doorThickness = 0.06;
    const doorCenterZ = 0.06;
    // The solid leaf reaches both skins; a small offset prevents coplanar flicker.
    const doorFrontZ = doorCenterZ + doorThickness / 2 + 0.0005;
    const doorBackZ = doorCenterZ - doorThickness / 2 - 0.0005;
    const doorOpeningWidth = doorWidth * 2;
    const wallThickness = 0.07;

    const frameWidth = doorOpeningWidth + 0.16;
    const frameHeight = frameWidth * (877 / 718);
    const frameZ = 0.12;

    const groundY = -2;
    // The doorway and paving meet the same ground; only a tiny lift avoids coplanar flicker.
    const floorY = groundY + 0.005;
    const doorBottomY = floorY;
    const doorCenterY = doorBottomY + doorHeight / 2;
    const frameCenterY = doorBottomY + frameHeight / 2;

    // Keep the original natural-edge artwork registered to the doorway.
    const pathEntranceLeft = 98 / 630;
    const pathEntranceRight = 478 / 630;
    const pathWidth = doorOpeningWidth / (pathEntranceRight - pathEntranceLeft);
    const pathCenterX = (0.5 - (pathEntranceLeft + pathEntranceRight) / 2) * pathWidth;
    const pathLength = 5.62;
    const pathStartZ = doorFrontZ;
    return {
      doorWidth,
      doorHeight,
      doorThickness,
      doorCenterZ,
      doorFrontZ,
      doorBackZ,
      doorOpeningWidth,
      wallThickness,
      frameWidth,
      frameHeight,
      frameZ,
      floorY,
      groundY,
      doorCenterY,
      frameCenterY,
      pathWidth,
      pathCenterX,
      pathLength,
      pathStartZ,
    };
  }, []);

  const {
    doorWidth,
    doorHeight,
    doorThickness,
    doorCenterZ,
    doorFrontZ,
    doorBackZ,
    doorOpeningWidth,
    wallThickness,
    frameWidth,
    frameHeight,
    frameZ,
    floorY,
    groundY,
    doorCenterY,
    frameCenterY,
    pathWidth,
    pathCenterX,
    pathLength,
    pathStartZ,
  } = dimensions;

  // Match the troughs' geometry outlines instead of relying only on enlarged image edges.
  const doorOutline = useMemo(() => {
    const body = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
    const outline = new THREE.EdgesGeometry(body);
    body.dispose();
    return outline;
  }, [doorWidth, doorHeight, doorThickness]);
  useEffect(() => () => doorOutline.dispose(), [doorOutline]);

  const planters = useMemo(() => createPlanterLayout(groundY, wallThickness / 2), [groundY, wallThickness]);
  const planterColliders = useMemo(() => createPlanterColliders(planters), [planters]);
  const pathLayout = useMemo(() => ({
    width: pathWidth,
    centerX: pathCenterX,
    shoulder: doorOpeningWidth / 2,
    leftLimit: Math.max(...planterColliders.filter((box) => box.max.x < 0).map((box) => box.max.x)) + 0.25,
    rightLimit: Math.min(...planterColliders.filter((box) => box.min.x > 0).map((box) => box.min.x)) - 0.25,
  }), [pathWidth, pathCenterX, doorOpeningWidth, planterColliders]);

  const pathGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(pathWidth, pathLength, 128, 1);
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++) {
      positions.setX(i, mapPavingX(uv.getX(i), pathLayout));
    }
    positions.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }, [pathWidth, pathLength, pathLayout]);
  const pathMap = useMemo(() => createPavingEdgeMap(stonePathTexture, pathLayout, anisotropy), [stonePathTexture, pathLayout, anisotropy]);
  useEffect(() => () => pathGeometry.dispose(), [pathGeometry]);
  useEffect(() => () => pathMap.dispose(), [pathMap]);

  // 点击门的处理函数
  const handleDoorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!enabled || isOpen || !canEnter) return;

    setIsOpen(true);
    document.body.style.cursor = "auto";
    onEnterStart?.();

    const tl = gsap.timeline({
      onComplete: () => {
        onEnter?.();
      }
    });
    entryTimeline.current = tl;

    // 开门动画
    if (leftDoorRef.current) {
      tl.to(leftDoorRef.current.rotation, {
        y: -THREE.MathUtils.degToRad(98),
        duration: 0.94,
        ease: 'power2.out'
      }, 0);
    }

    if (rightDoorRef.current) {
      tl.to(rightDoorRef.current.rotation, {
        y: THREE.MathUtils.degToRad(98),
        duration: 0.94,
        ease: 'power2.out'
      }, 0);
    }

    // 相机飞入动画 - 调整到 about 场景的正确位置（场景组在 z=-25，相机在 z=-19.1）
    tl.to(camera.position, {
      z: -19.1,
      y: 0.2,
      duration: 1.84,
      ease: 'power2.inOut'
    }, 0.28);
  };

  // 悬停处理
  const handlePointerEnter = () => {
    if (isOpen || !canEnter) return;
    document.body.style.cursor = "pointer";

    if (leftDoorRef.current && rightDoorRef.current) {
      gsap.to(leftDoorRef.current.rotation, {
        y: -0.08,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: true
      });
      gsap.to(rightDoorRef.current.rotation, {
        y: 0.08,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: true
      });
    }
  };

  const handlePointerLeave = () => {
    if (isOpen || !canEnter) return;
    document.body.style.cursor = "auto";

    if (leftDoorRef.current && rightDoorRef.current) {
      gsap.to(leftDoorRef.current.rotation, {
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: true
      });
      gsap.to(rightDoorRef.current.rotation, {
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: true
      });
    }
  };

  return (
    <group ref={groupRef} position={[position[0], 0, position[2]]} visible={enabled}>
      {/* 基础地面止于墙正面，接住墙脚，但不能伸进门后的空间。 */}
      <mesh
        name="entrance-ground"
        position={[0, groundY, wallThickness / 2 + groundLength / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[25, groundLength]} />
        <meshBasicMaterial
          color="#ffffff"
          map={groundMap}
        />
      </mesh>

      {/* 路面与门底共用地面基准；画布两侧保留草叶和纸纹过渡。 */}
      <mesh
        name="entrance-stone-path"
        geometry={pathGeometry}
        position={[0, floorY, pathStartZ + pathLength / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color="#e0e0e0"
          map={pathMap}
          transparent={true}
        />
      </mesh>

      {/* 测试用大型点击区域 */}
      <mesh
        position={[0, doorCenterY, 0.15]}
        onClick={handleDoorClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <planeGeometry args={[doorOpeningWidth + 1, doorHeight + 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 门框 —— depthWrite=false：避免贴图透明区写入深度缓冲遮挡门后场景（与 ref 一致） */}
      <mesh name="entrance-door-frame" position={[0, frameCenterY, frameZ]}>
        <planeGeometry args={[frameWidth, frameHeight]} />
        <meshBasicMaterial
          color="#e0e0e0"
          map={frameTexture}
          transparent={true}
          alphaTest={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* 简介居中悬挂在门框上方；相机飞入时按透视缩放，穿过墙面后自动隐藏。 */}
      {enabled && introductionBoard && (
        <Html
          transform
          position={[0, 1.7, wallThickness / 2 + 0.01]}
          distanceFactor={1}
          // DOM 宽度与字号按两倍绘制，原 scale=3 减半以保持板面世界尺寸。
          scale={1.5}
          pointerEvents="none"
          zIndexRange={[1, 0]}
        >
          {introductionBoard}
        </Html>
      )}

      <PaperWindow ref={windowRef} sketch={windowSketchTexture} glass={windowGlassTexture} paper={floorPaperTexture}
        interactive={enabled && canEnter && !isOpen} groundY={groundY} colliders={planterColliders} />
      <EntrancePlanters layout={planters} colliders={planterColliders} textures={textures}
        interactive={enabled && canEnter && !isOpen} groundY={groundY} />
      <PaperPet paper={floorPaperTexture} wood={textures.gardenWood} wallFrontZ={wallThickness / 2}
        mode={petMode} panelOpen={petPanelOpen} onWake={onPetWake} trigger={petTrigger} reply={petReply} greeting={petGreeting}
        replyPortal={petReplyPortal}
        enabled={enabled && petVisible} interactive={enabled && petVisible && canEnter && !isOpen} />

      {/* 左门 */}
      <group ref={leftDoorRef} position={[-doorWidth, doorCenterY, 0]}>
        {/* 3D 门体 */}
        <mesh
          position={[doorWidth / 2, 0, doorCenterZ]}
          onClick={handleDoorClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <boxGeometry args={[doorWidth, doorHeight, doorThickness]} />
          <meshBasicMaterial color="#e0e0e0" map={edgeTexture} />
        </mesh>
        <lineSegments geometry={doorOutline} position={[doorWidth / 2, 0, doorCenterZ]} raycast={() => {}}>
          <lineBasicMaterial color="#575953" transparent opacity={0.7} />
        </lineSegments>

        {/* 正面草图纹理 */}
        <mesh
          position={[doorWidth / 2, 0, doorFrontZ]}
          onClick={handleDoorClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <planeGeometry args={[doorWidth, doorHeight]} />
          <meshBasicMaterial
            color="#e0e0e0"
            map={doorLeftTexture}
            transparent={true}
            alphaTest={0.5}
          />
        </mesh>

        {/* 背面纹理 */}
        <mesh position={[doorWidth / 2, 0, doorBackZ]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
          <planeGeometry args={[doorWidth, doorHeight]} />
          <meshBasicMaterial
            color="#e0e0e0"
            map={doorBackTexture}
            transparent={true}
            alphaTest={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 手柄 */}
        <group position={[doorWidth / 2 + 0.357, -0.099, doorFrontZ + 0.01]}>
          <mesh position={[-0.357, 0.099, 0]}>
            <planeGeometry args={[doorWidth, doorHeight]} />
            <meshBasicMaterial
              color="#e0e0e0"
              map={handleLeftTexture}
              transparent={true}
              alphaTest={0.5}
            />
          </mesh>
        </group>
      </group>

      {/* 右门 */}
      <group ref={rightDoorRef} position={[doorWidth, doorCenterY, 0]}>
        {/* 3D 门体 */}
        <mesh
          position={[-doorWidth / 2, 0, doorCenterZ]}
          onClick={handleDoorClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <boxGeometry args={[doorWidth, doorHeight, doorThickness]} />
          <meshBasicMaterial color="#e0e0e0" map={edgeTexture} />
        </mesh>
        <lineSegments geometry={doorOutline} position={[-doorWidth / 2, 0, doorCenterZ]} raycast={() => {}}>
          <lineBasicMaterial color="#575953" transparent opacity={0.7} />
        </lineSegments>

        {/* 正面草图纹理 */}
        <mesh
          position={[-doorWidth / 2, 0, doorFrontZ]}
          onClick={handleDoorClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <planeGeometry args={[doorWidth, doorHeight]} />
          <meshBasicMaterial
            color="#e0e0e0"
            map={doorRightTexture}
            transparent={true}
            alphaTest={0.5}
          />
        </mesh>

        {/* 背面纹理 */}
        <mesh position={[-doorWidth / 2, 0, doorBackZ]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[doorWidth, doorHeight]} />
          <meshBasicMaterial
            color="#e0e0e0"
            map={doorBackTexture}
            transparent={true}
            alphaTest={0.5}
          />
        </mesh>

        {/* 手柄 */}
        <group position={[-doorWidth / 2 - 0.357, -0.099, doorFrontZ + 0.01]}>
          <mesh position={[0.357, 0.099, 0]}>
            <planeGeometry args={[doorWidth, doorHeight]} />
            <meshBasicMaterial
              color="#e0e0e0"
              map={handleRightTexture}
              transparent={true}
              alphaTest={0.5}
            />
          </mesh>
        </group>
      </group>

      {/* 入口墙 —— 三块实体墙板围出门洞，门洞内无任何几何体，门后场景直接可见 */}
      <EntranceWall
        corridorWidth={corridorWidth}
        corridorHeight={Math.max(corridorHeight, fittedDistance * 1.25)}
        doorOpeningWidth={doorOpeningWidth}
        doorHeight={doorHeight}
        floorY={floorY}
        groundY={groundY}
        wallThickness={wallThickness}
      />
    </group>
  );
};

export default EntranceDoors;
