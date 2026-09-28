import { use, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { loadCloudCanvases } from './cloudField';
import SkyChunk, { CHUNK_LENGTH } from './SkyChunk';

// Clouds only; portfolio content and camera focus have their own owner.
export default function InfiniteSkyManager({ scrollProgressRef }) {
  const worldRef = useRef();
  const currentChunk = useRef(0);
  const [activeChunks, setActiveChunks] = useState([-1, 0, 1, 2]);
  const canvases = use(loadCloudCanvases());
  const textures = useMemo(() => canvases.map((canvas) => {
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }), [canvases]);
  // Only this owner releases the pool, never an individual cloud or chunk.
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);

  useFrame(() => {
    // SkyChunk keeps each cloud in its original local chunk coordinates.
    // Its clipping/evasion already includes scroll, so the parent must move too.
    if (worldRef.current) worldRef.current.position.z = scrollProgressRef.current;
    const next = Math.floor(scrollProgressRef.current / CHUNK_LENGTH);
    if (next === currentChunk.current) return;
    currentChunk.current = next;
    setActiveChunks([next - 1, next, next + 1, next + 2]);
  });

  return (
    <group ref={worldRef} name="infinite-clouds">
      {activeChunks.map((chunkIndex) => (
        <SkyChunk key={chunkIndex} chunkIndex={chunkIndex} seed={42} textures={textures} scrollProgressRef={scrollProgressRef} />
      ))}
    </group>
  );
}
