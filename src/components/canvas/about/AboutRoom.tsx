import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import PaperAirplane from './PaperAirplane';
import InfiniteSkyManager from './InfiniteSkyManager';
import PortfolioField from '../portfolio/PortfolioField';
import type { PortfolioPhase } from '../../../data/note';
import { rafThrottle } from '../../../utils/performance';

// 镜头节奏独立于云层区块回收，保持无限飞行时的连续姿态。
const FLIGHT_CYCLE_DISTANCE = 41.5;

// 滚动惯性参数。scrollVelocity 以“60Hz 帧对应的滚动单位”为基准，
// SCROLL_FRICTION 使用指数衰减，因此不同刷新率下的减速时间基本一致。
const SCROLL_FRICTION = 3.1;
const WHEEL_IMPULSE_SCALE = 0.00204;
const TOUCH_IMPULSE_SCALE = 0.00492;
const MAX_SCROLL_IMPULSE = 0.5;
const MAX_SCROLL_VELOCITY = 3.5;
const FLIGHT_HINT_DISMISS_DISTANCE = 1.8;

// 相机飞行姿态的最大幅度。数值保持较小，避免纸飞机飞行时镜头产生明显抖动。
const CAMERA_BANK_AMPLITUDE = 0.039;
const CAMERA_PITCH_AMPLITUDE = 0.0145;
const CAMERA_TILT_SMOOTHING = 4;

// 从首次显示起就保持轻微抬头，初始姿态与进入后的飞行基准一致。
const AIRPLANE_BASE_PITCH = 0.105;

const PITCH_AXIS = new THREE.Vector3(1, 0, 0);
const BANK_AXIS = new THREE.Vector3(0, 0, 1);

interface AboutRoomProps {
  hasEntered: boolean;
  isReturningHome: boolean;
  selectedProjectId: string | null;
  portfolioPhase: PortfolioPhase;
  onSelectProject: (id: string) => void;
  onPortfolioPhaseChange: (phase: PortfolioPhase) => void;
  onFlightDistanceReached: () => void;
  onFlightHintProgress: (progress: number) => void;
}

const AboutRoom: React.FC<AboutRoomProps> = ({ hasEntered, isReturningHome, selectedProjectId, portfolioPhase, onSelectProject, onPortfolioPhaseChange, onFlightDistanceReached, onFlightHintProgress }) => {
    const camera = useThree((state) => state.camera);
    const aspect = useThree((state) => state.size.width / state.size.height);
    // 按固定飞行机位的可见宽度收缩宽翼，给窄竖屏的横滚留出余量。
    const airplaneScale = Math.min(0.8, aspect * 1.8);
    const interactionLocked = useRef(false);
    const flightHintDismissed = useRef(false);

    // scrollPosition 是场景的唯一滚动进度，单位对应天空世界坐标的前后移动距离。
    // 它通过 ref 传给 InfiniteSkyManager，避免每一帧更新 React state。
    const scrollPosition = useRef(0);
    const flightHintTravel = useRef(0);

    // 滚轮/触摸不会直接修改位置，而是给速度增加冲量；停止输入后由摩擦力自然减速。
    const scrollVelocity = useRef(0);

    // 保存进入关于场景时的相机基础旋转。
    // 飞行姿态只作为增量叠加在这个基础旋转上，不直接覆盖开门动画的结果。
    const baseCameraRotation = useRef({ x: 0, y: 0, z: 0 });

    // 未开始滚动时不启用周期性的飞行倾斜，避免入口画面静止时镜头自行晃动。
    const isFlightActive = useRef(false);

    // 当前相机姿态的实际值。它们会缓慢追踪目标角度，防止滚动位置变化造成瞬间跳变。
    const currentBank = useRef(0);
    const currentPitch = useRef(0);

    // 下面这些数学对象会在动画帧之间复用，避免 useFrame 中反复分配对象造成额外 GC 和卡顿。
    const baseEuler = useMemo(() => new THREE.Euler(), []);
    const baseQuat = useMemo(() => new THREE.Quaternion(), []);
    const pitchQuat = useMemo(() => new THREE.Quaternion(), []);
    const bankQuat = useMemo(() => new THREE.Quaternion(), []);
    const finalQuat = useMemo(() => new THREE.Quaternion(), []);

    const airplaneGroupRef = useRef<THREE.Group>(null);

    // 进入或返回首页都清空飞行状态；相机位置由 EntranceDoors 管理。
    useEffect(() => {
        scrollPosition.current = 0;
        flightHintTravel.current = 0;
        onFlightHintProgress(0);
        scrollVelocity.current = 0;
        currentBank.current = 0;
        currentPitch.current = 0;
        isFlightActive.current = false;
        flightHintDismissed.current = false;
        if (airplaneGroupRef.current) {
            airplaneGroupRef.current.visible = true;
            airplaneGroupRef.current.rotation.set(AIRPLANE_BASE_PITCH, 0, 0);
        }

        if (hasEntered) {
            // 不要在这里强制设置相机位置。开门动画结束后会把相机放到正确的 z 坐标，
            // 如果此处再次设置位置，会和入口场景的转场产生竞争。
            // camera.position.set(0, 0.2, -19.1);

            // 关于场景从水平视角开始，不预设额外俯视角度。
            camera.rotation.x = 0;
            camera.rotation.y = 0;
            camera.rotation.z = 0;

            // 基础旋转必须和相机实际旋转保持一致，后续四元数才能正确叠加。
            baseCameraRotation.current = { x: 0, y: 0, z: 0 };
        }
    }, [hasEntered, camera, onFlightHintProgress]);

    useFrame((_state, delta) => {
        // 场景在入口门后始终挂载，但只有完成进入后才接管滚动和相机控制。
        if (!hasEntered) return;
        if (isReturningHome) {
            // Preserve the corridor position until it is behind the closed doors.
            scrollVelocity.current = 0;
            return;
        }
        if (airplaneGroupRef.current) airplaneGroupRef.current.visible = !interactionLocked.current;
        if (interactionLocked.current) {
            scrollVelocity.current = 0;
            return;
        }

        // 先积分速度得到当前位置，再对速度做指数衰减。
        // frameDelta 限制在 100ms 内，避免切回后台标签页时一次性跳过很长距离。
        const frameDelta = Math.min(delta, 0.1);
        const previousScrollPosition = scrollPosition.current;
        scrollPosition.current += scrollVelocity.current * frameDelta * 60;
        flightHintTravel.current += Math.abs(scrollPosition.current - previousScrollPosition);
        scrollVelocity.current *= Math.exp(-SCROLL_FRICTION * frameDelta);
        if (Math.abs(scrollVelocity.current) < 0.0005) {
            scrollVelocity.current = 0;
        }
        if (!flightHintDismissed.current && scrollPosition.current !== previousScrollPosition) {
            const progress = Math.min(1, flightHintTravel.current / FLIGHT_HINT_DISMISS_DISTANCE);
            onFlightHintProgress(progress);
            if (progress >= 1) {
                flightHintDismissed.current = true;
                onFlightDistanceReached();
            }
        }

        // 滚动超过阈值后才开始镜头倾斜。这样初始点击、轻微触摸或微小滚轮噪声
        // 不会让镜头在刚进入时产生不必要的晃动。
        if (!isFlightActive.current && Math.abs(scrollPosition.current) > 0.52) {
            isFlightActive.current = true;
            baseCameraRotation.current = {
                x: camera.rotation.x,
                y: camera.rotation.y,
                z: camera.rotation.z
            };
        }

        if (isFlightActive.current) {
            // 用当前区块内的相对进度生成周期姿态，取模后可无限循环。
            const phase = (scrollPosition.current % FLIGHT_CYCLE_DISTANCE) * (2 * Math.PI / FLIGHT_CYCLE_DISTANCE);
            let bankAngle = (0.97 * Math.sin(phase) + 0.03 * Math.sin(phase * 3)) * CAMERA_BANK_AMPLITUDE;
            let pitchAngle = Math.sin(phase * 2 + 0.06 * Math.sin(phase)) * CAMERA_PITCH_AMPLITUDE;

            // 飞行姿态从小到大渐入；使用绝对值保证倒飞时也会有同样的镜头反馈。
            const flightProgress = THREE.MathUtils.clamp((Math.abs(scrollPosition.current) - 0.52) / 4.9, 0, 1);
            bankAngle *= flightProgress;
            pitchAngle *= flightProgress;

            // 指数形式的插值是帧率无关的：30fps 和 60fps 下都会接近相同的跟随速度。
            const lerpSpeed = 1 - Math.exp(-CAMERA_TILT_SMOOTHING * frameDelta);
            currentBank.current = THREE.MathUtils.lerp(currentBank.current, bankAngle, lerpSpeed);
            currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, pitchAngle, lerpSpeed);

            // 使用四元数组合基础旋转和飞行增量。
            // 直接叠加欧拉角会受到旋转顺序影响，并可能在基础旋转不为零时产生抖动或偏转。

            baseEuler.set(
                baseCameraRotation.current.x,
                baseCameraRotation.current.y,
                baseCameraRotation.current.z,
                'XYZ',
            );
            baseQuat.setFromEuler(baseEuler);

            // 在相机局部坐标系中构造俯仰和横滚增量。
            pitchQuat.setFromAxisAngle(PITCH_AXIS, currentPitch.current);
            bankQuat.setFromAxisAngle(BANK_AXIS, currentBank.current);

            // 组合顺序：基础旋转 × 俯仰 × 横滚。
            // 复用 finalQuat，避免每一帧 clone 出新的四元数。
            finalQuat.copy(baseQuat).multiply(pitchQuat).multiply(bankQuat);

            // 应用到相机
            camera.quaternion.copy(finalQuat);

        } else {
            currentBank.current = 0;
            currentPitch.current = 0;
        }

        // 纸飞机的姿态比镜头更明显一些，方便用户感知飞行方向；
        // 位置本身固定在下方，只跟随相机的倾斜角度旋转。
        if (airplaneGroupRef.current) {
            airplaneGroupRef.current.rotation.x = currentPitch.current * 2.92 + AIRPLANE_BASE_PITCH;
            airplaneGroupRef.current.rotation.z = -currentBank.current * 1.94;
        }
    });

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (!hasEntered || isReturningHome || interactionLocked.current) return;
            if (e.target instanceof Element && e.target.closest('button, a, dialog, nav')) return;

            // deltaMode=0 通常来自鼠标/触控板像素值，1 是行，2 是页。
            // 先换算到近似像素单位，再统一转换为速度冲量，保证不同设备的手感接近。
            const normalizedDelta = e.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? e.deltaY * 16
                : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
                    ? e.deltaY * window.innerHeight
                    : e.deltaY;
            // 单次冲量限幅，防止操作系统或设备突然上报一个异常大的 deltaY。
            const distance = THREE.MathUtils.clamp(
                normalizedDelta * WHEEL_IMPULSE_SCALE,
                -MAX_SCROLL_IMPULSE,
                MAX_SCROLL_IMPULSE,
            );
            // 速度冲量允许连续叠加，所以快速连续滚轮会滑得更远；同时设置总速度上限。
            scrollVelocity.current = THREE.MathUtils.clamp(
                scrollVelocity.current + distance,
                -MAX_SCROLL_VELOCITY,
                MAX_SCROLL_VELOCITY,
            );
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [hasEntered, isReturningHome]);

    const lastTouchY = useRef(0);
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (!hasEntered || isReturningHome || interactionLocked.current) return;
            if (e.touches.length === 1) {
                // 只记录单指起点；多指手势交给浏览器，不参与纸飞机飞行控制。
                lastTouchY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = rafThrottle((e: TouchEvent) => {
            if (!hasEntered || isReturningHome || interactionLocked.current) return;
            if (e.target instanceof Element && e.target.closest('button, a, dialog, nav')) return;
            if (e.touches.length === 1) {
                // 手指向上移动代表向前飞，向下移动代表向后飞。
                // rafThrottle 将高频 touchmove 合并到每帧一次，减少输入回调压力。
                const deltaY = lastTouchY.current - e.touches[0].clientY;
                lastTouchY.current = e.touches[0].clientY;
                const impulse = THREE.MathUtils.clamp(
                    deltaY * TOUCH_IMPULSE_SCALE,
                    -MAX_SCROLL_IMPULSE,
                    MAX_SCROLL_IMPULSE,
                );
                scrollVelocity.current = THREE.MathUtils.clamp(
                    scrollVelocity.current + impulse,
                    -MAX_SCROLL_VELOCITY,
                    MAX_SCROLL_VELOCITY,
                );
            }
        });

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, [hasEntered, isReturningHome]);

    return (
        <group position={[0, 0, -25]}>
            {/*
             * 纸飞机固定在镜头前方并略低于视线：
             * - x=0：保持在画面水平中心
             * - y=-1.5：把飞机压到画面下方，避免遮挡天空和里程碑
             * - z=1：位于相机前方，和相机一起表现为前景物体
             */}
            <group ref={airplaneGroupRef} position={[0, -1.5, 1]} rotation={[AIRPLANE_BASE_PITCH, 0, 0]}>
                <PaperAirplane scale={airplaneScale} />
            </group>

            {/* 天空、云朵和故事里程碑都读取同一个 scrollPosition，保证视觉同步。 */}
            <InfiniteSkyManager scrollProgressRef={scrollPosition} />
            <PortfolioField
                scrollProgressRef={scrollPosition}
                lockedRef={interactionLocked}
                enabled={hasEntered}
                isReturningHome={isReturningHome}
                selectedId={selectedProjectId}
                portfolioPhase={portfolioPhase}
                onSelect={onSelectProject}
                onPhaseChange={onPortfolioPhaseChange}
            />

            {/*
             * 天空底板位于房间局部 z=-200，即世界 z=-225，超出相机 far=150，正常情况下不会渲染。
             * 保持这个位置是为了避免飞入动画期间底板被拉近，造成整屏闪蓝；它只作为远处的安全兜底。
             */}
            <mesh position={[0, 0, -200]}>
                <planeGeometry args={[300, 150]} />
                <meshBasicMaterial color="#87CEEB" side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

export default AboutRoom;
