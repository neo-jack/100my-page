import { useSceneTexture } from '../../../../utils/useSceneTexture';
import assetWallPaper from '../../../../../public/textures/entrance/wall-paper.webp?url';
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface EntranceWallProps {
  /** 走廊总宽（与 EntranceDoors 同源） */
  corridorWidth: number;
  /** 走廊总高（与 EntranceDoors 同源） */
  corridorHeight: number;
  /** 门洞宽度 = doorWidth * 2 */
  doorOpeningWidth: number;
  /** 单扇门高度 */
  doorHeight: number;
  /** 地面 Y 基准线 */
  floorY: number;
  /** 纸质地面；侧墙需延伸到地面，门洞仍以门槛为准。 */
  groundY?: number;
  /** 墙板厚度 */
  wallThickness?: number;
}

/** 纹理密度：每 2.5 世界单位一个 tile。 */
const TILE_SIZE = 2.5;

/**
 * 入口墙 —— 三块纸质纹理墙板围出门洞
 *
 * 设计要点：
 * 1. 不使用 ShapeGeometry 挖洞。左板 / 右板 / 顶板三块 boxGeometry 围出的空缺即门洞，
 *    中间没有任何几何体，因此门后场景天然可见，也不存在「透明像素占住 z-buffer」的问题。
 * 2. 门洞尺寸由 doorOpeningWidth / doorHeight 直接推导，与门体同源，不可能错位。
 * 3. 材质使用独立的 wall-paper.webp 浅灰白石砖纸感纹理。
 *    墙面完全不透明，因此绝不可铺成一整块
 *    覆盖门洞的平面 —— 那会把门后场景整个挡死。只能贴在三块围洞的墙板上。
 * 4. 组件内不放任何天空背景平面 —— 门后背景由 Canvas 的 clear color 与 AboutRoom 提供。
 */
const EntranceWall: React.FC<EntranceWallProps> = ({
  corridorWidth,
  corridorHeight,
  doorOpeningWidth,
  doorHeight,
  floorY,
  groundY = floorY,
  wallThickness = 0.07,
}) => {
  const paperTexture = useSceneTexture(assetWallPaper);
  const anisotropy = useThree((state) => Math.min(8, state.gl.capabilities.getMaxAnisotropy()));

  const {
    wallCenterY,
    topWallHeight,
    topWallCenterY,
    sideWallWidth,
    sideWallOffsetX,
    sideWallHeight,
  } = useMemo(() => {
    const _sideWallHeight = corridorHeight + floorY - groundY;
    const _wallCenterY = groundY + _sideWallHeight / 2;
    const _topWallHeight = corridorHeight - doorHeight;
    const _topWallCenterY = floorY + doorHeight + _topWallHeight / 2;
    const _sideWallWidth = (corridorWidth - doorOpeningWidth) / 2;

    return {
      wallCenterY: _wallCenterY,
      topWallHeight: _topWallHeight,
      topWallCenterY: _topWallCenterY,
      sideWallWidth: _sideWallWidth,
      sideWallOffsetX: doorOpeningWidth / 2 + _sideWallWidth / 2,
      sideWallHeight: _sideWallHeight,
    };
  }, [corridorWidth, corridorHeight, doorOpeningWidth, doorHeight, floorY, groundY]);

  // 侧板与顶板尺寸不同，各自克隆一份纹理设置 repeat，避免纸纹被拉伸变形
  const { leftTexture, rightTexture, topTexture } = useMemo(() => {
    const make = (width: number, height: number, left: number, bottom: number) => {
      const tex = paperTexture.clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = anisotropy;
      tex.repeat.set(width / TILE_SIZE, height / TILE_SIZE);
      tex.offset.set(left / TILE_SIZE, bottom / TILE_SIZE);
      return tex;
    };

    return {
      leftTexture: make(sideWallWidth, sideWallHeight, -corridorWidth / 2, groundY),
      rightTexture: make(sideWallWidth, sideWallHeight, doorOpeningWidth / 2, groundY),
      topTexture: make(doorOpeningWidth, topWallHeight, -doorOpeningWidth / 2, floorY + doorHeight),
    };
  }, [paperTexture, sideWallWidth, sideWallHeight, doorOpeningWidth, topWallHeight, corridorWidth, groundY, floorY, doorHeight, anisotropy]);

  // clone() 出来的纹理不受 useTexture 缓存管理，必须自行释放
  useEffect(() => {
    return () => {
      leftTexture.dispose();
      rightTexture.dispose();
      topTexture.dispose();
    };
  }, [leftTexture, rightTexture, topTexture]);

  return (
    <>
      {/* 左墙板 */}
      <mesh position={[-sideWallOffsetX, wallCenterY, 0]}>
        <boxGeometry args={[sideWallWidth, sideWallHeight, wallThickness]} />
        <meshBasicMaterial color="#ffffff" map={leftTexture} />
      </mesh>

      {/* 右墙板 */}
      <mesh position={[sideWallOffsetX, wallCenterY, 0]}>
        <boxGeometry args={[sideWallWidth, sideWallHeight, wallThickness]} />
        <meshBasicMaterial color="#ffffff" map={rightTexture} />
      </mesh>

      {/* 顶墙板（门上方过梁）—— 只覆盖门洞正上方 */}
      <mesh position={[0, topWallCenterY, 0]}>
        <boxGeometry args={[doorOpeningWidth, topWallHeight, wallThickness]} />
        <meshBasicMaterial color="#ffffff" map={topTexture} />
      </mesh>
    </>
  );
};

export default EntranceWall;
