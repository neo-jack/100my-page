import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCloudField, sampleWind, CHUNK_LENGTH } from './cloudField';

const CORRIDOR_CLIP_Z = -8.2;
const ROOM_Z = -25;

interface SkyChunkProps {
    chunkIndex?: number;
    seed?: number;
    textures: readonly THREE.Texture[];
    scrollProgressRef: React.MutableRefObject<number>;
}

const SkyChunk: React.FC<SkyChunkProps> = ({ chunkIndex = 0, seed = 0, textures, scrollProgressRef }) => {
    const clouds = useMemo(() => createCloudField(chunkIndex, seed), [chunkIndex, seed]);
    return (
        <group>
            {clouds.map((cloud) => (
                <Cloud key={cloud.id} cloud={cloud} texture={textures[cloud.textureIndex]} scrollProgressRef={scrollProgressRef} />
            ))}
        </group>
    );
};

function Cloud({ cloud, texture, scrollProgressRef }: {
    cloud: ReturnType<typeof createCloudField>[number];
    texture: THREE.Texture;
    scrollProgressRef: React.MutableRefObject<number>;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const tilt = useMemo(() => new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), cloud.tilt,
    ), [cloud.tilt]);

    useFrame(({ clock, camera }) => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const [x, y, z] = cloud.position;
        const worldZ = ROOM_Z + scrollProgressRef.current + z;
        mesh.visible = worldZ <= CORRIDOR_CLIP_Z;
        if (!mesh.visible) return;

        // Nearby clouds share a smooth spatial gust field.
        const windTime = clock.elapsedTime * 0.075;
        const windX = sampleWind(z * 0.027 + windTime, cloud.windSeed);
        const windY = sampleWind(z * 0.019 - windTime * 0.6 + y * 0.08, cloud.windSeed + 1);
        const approach = THREE.MathUtils.smootherstep(worldZ, -52, -12);
        const clearance = 3.8 + cloud.width * 0.55;
        const outward = Math.max(0, clearance - Math.abs(x)) * approach;
        mesh.position.set(x + cloud.side * outward + windX * 0.85, y + windY * 0.28, z);
        mesh.quaternion.copy(camera.quaternion).multiply(tilt);
    });

    return (
        <mesh ref={meshRef} position={cloud.position}>
            <planeGeometry args={[cloud.width, cloud.height]} />
            <meshBasicMaterial map={texture} transparent opacity={cloud.opacity} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
    );
}

export { CHUNK_LENGTH, CORRIDOR_CLIP_Z, ROOM_Z };
export default SkyChunk;
