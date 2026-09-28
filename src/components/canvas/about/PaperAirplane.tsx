import { use, useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { createPaperAirplaneModel, loadPaperCanvas } from './paperAirplaneModel';

interface PaperAirplaneProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    color?: string;
}

/** 宽三角翼、中央折脊和下折尾部；朝向仍为局部 -Z。 */
const PaperAirplane: React.FC<PaperAirplaneProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    color = '#faf9f6',
}) => {
    const canvas = use(loadPaperCanvas());
    const model = useMemo(() => createPaperAirplaneModel(canvas), [canvas]);

    useEffect(() => () => {
        model.geometry.dispose();
        model.texture.dispose();
    }, [model]);

    return (
        <group name="paper-airplane" position={position} rotation={rotation} scale={scale}>
            <mesh geometry={model.geometry}>
                <meshBasicMaterial
                    color={color}
                    map={model.texture}
                    vertexColors
                    side={THREE.DoubleSide}
                    toneMapped={false}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </mesh>
            {/* 只保留真实折痕，纸张外缘不描线。 */}
            <Line points={model.creases} segments color="#73736e" lineWidth={1.05} />
        </group>
    );
};

export default PaperAirplane;
