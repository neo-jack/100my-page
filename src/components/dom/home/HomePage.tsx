import assetFloorPaper from '../../../../public/textures/entrance/floor_paper.webp?url';
import type { SyntheticEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import EntranceDoors from '../../canvas/entrance/door/EntranceDoors.tsx';
import AboutRoom from '../../canvas/about/AboutRoom.tsx';
import SceneWarmup from '../../canvas/SceneWarmup.tsx';
import SceneActivity from '../../canvas/SceneActivity.tsx';
import StartupLoader from '../loading/StartupLoader.tsx';
import IntroductionBoard from '../board/IntroductionBoard.tsx';
import PortfolioDetails from '../portfolio/PortfolioDetails.tsx';
import FlightGestureHint from '../flight/FlightGestureHint.tsx';
import { PaperPetTrigger, PaperPetReply, usePaperPet } from '@my-page/ai-pet';
import { SiteShell } from '../../ui/SiteShell.tsx';
import type { PortfolioPhase } from '../../../data/note';
import { reportStartupError, setStartupProgress } from '../../../utils/startup.ts';
import type { PaperWindowHandle } from '../../canvas/entrance/window/PaperWindow';
import type { SceneAction } from '@my-page/ai-pet/protocol';

import { integrations } from '../../../data/integrations';

const handleWarmupProgress = (progress: number) => setStartupProgress('scene', progress);
const MOBILE_SCENE_QUERY = '(max-width: 600px), (hover: none) and (pointer: coarse)';

export function HomePage() {
  const [mobileScene, setMobileScene] = useState(() => window.matchMedia(MOBILE_SCENE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_SCENE_QUERY);
    const update = () => setMobileScene(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [hasEntered, setHasEntered] = useState(false);
  const [flightHintDismissed, setFlightHintDismissed] = useState(false);
  const flightHintElement = useRef<HTMLElement | null>(null);
  const flightHintProgress = useRef(0);
  const attachFlightHint = useCallback((element: HTMLElement | null) => {
    flightHintElement.current = element;
    if (element) element.style.opacity = String(1 - flightHintProgress.current);
  }, []);
  const handleFlightHintProgress = useCallback((progress: number) => {
    flightHintProgress.current = progress;
    if (flightHintElement.current) {
      flightHintElement.current.style.opacity = String(1 - progress);
    }
  }, []);
  const [isEntering, setIsEntering] = useState(false);
  const [isReturningHome, setIsReturningHome] = useState(false);
  const showEntranceContent = !isEntering && !hasEntered && !isReturningHome;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [portfolioPhase, setPortfolioPhase] = useState<PortfolioPhase>('idle');
  const closeProject = useCallback(() => setSelectedProjectId(null), []);
  const [sceneWarm, setSceneWarm] = useState(false);
  const [introBoardReady, setIntroBoardReady] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const windowRef = useRef<PaperWindowHandle>(null);
  const handleSceneActions = useCallback((actions: SceneAction[]) => {
    if (mobileScene || !showEntranceContent || !pageReady || !sceneWarm) return ['当前场景暂时无法操作'];
    return actions.map((action) => {
      if (action !== 'break_glass') return '当前场景不支持该操作';
      const result = windowRef.current?.breakGlass();
      return result === 'started' ? '已向一块完整玻璃投出小石头'
        : result === 'exhausted' ? '三块玻璃都已打碎，没有完整窗格了' : '窗户暂时无法操作';
    });
  }, [mobileScene, showEntranceContent, pageReady, sceneWarm]);
  const pet = usePaperPet(!mobileScene && showEntranceContent && pageReady, handleSceneActions, { endpoint: integrations.aiEndpoint, sceneActions: true });
  const petReplyPortal = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    flightHintProgress.current = 0;
    setFlightHintDismissed(false);
    setHasEntered(true);
    setIsEntering(false);
  };

  const handleEnterStart = useCallback(() => {
    setIsEntering(true);
  }, []);
  const handleReturnHome = useCallback(() => {
    setIsReturningHome(true);
    setSelectedProjectId(null);
    setPortfolioPhase('idle');
  }, []);
  const handleReturnHomeComplete = useCallback(() => {
    setIsReturningHome(false);
    setIsEntering(false);
    setHasEntered(false);
  }, []);
  const handleFlightDistanceReached = useCallback(() => {
    setFlightHintDismissed(true);
  }, []);

  const handleSceneWarm = useCallback(() => {
    setSceneWarm(true);
  }, []);
  const handleStartupComplete = useCallback(() => setPageReady(true), []);
  const handleIntroBoardLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.decode().then(() => setIntroBoardReady(true)).catch(reportStartupError);
  }, []);

  return (
    <SiteShell onReturnHome={hasEntered && !isReturningHome ? handleReturnHome : undefined}>
    <main className="relative min-h-screen bg-transparent text-l1">
      {!pageReady && <StartupLoader ready={sceneWarm && introBoardReady} onComplete={handleStartupComplete} />}
      {/* Three.js 入口场景作为背景层 */}
      <div className="fixed inset-0 z-0 pointer-events-auto" style={{ backgroundColor: 'transparent' }}>
        <Canvas
          frameloop="never"
          camera={{ position: [0, 0.2, 28], fov: 60, near: 0.1, far: 150 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          style={{ cursor: 'auto' }}
        >
          <SceneActivity ready={sceneWarm} />
          {/* 背景色 / 雾色回退为 #fafafa（与 ref 一致） */}
          <color attach="background" args={['#fafafa']} />
          <fog attach="fog" args={['#fafafa', 15, 50]} />

          <Suspense fallback={null}>
            <SceneWarmup onReady={handleSceneWarm} onProgress={handleWarmupProgress} onError={reportStartupError} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1} />

            {/* AboutRoom 始终渲染，放在门后位置（与 ref 走廊相同的逻辑） */}
            <AboutRoom
              hasEntered={hasEntered}
              isReturningHome={isReturningHome}
              selectedProjectId={selectedProjectId}
              portfolioPhase={portfolioPhase}
              onSelectProject={setSelectedProjectId}
              onPortfolioPhaseChange={setPortfolioPhase}
              onFlightDistanceReached={handleFlightDistanceReached}
              onFlightHintProgress={handleFlightHintProgress}
            />

            {/* EntranceDoors 在最上层，门打开时能看到后面的 AboutRoom */}
            <EntranceDoors
              position={[0, 0, 22]}
              onEnterStart={handleEnterStart}
              onEnter={handleEnter}
              isReturningHome={isReturningHome}
              onReturnHomeComplete={handleReturnHomeComplete}
              enabled={!hasEntered || isReturningHome}
              canEnter={sceneWarm && pageReady && !isReturningHome}
              introductionBoard={<IntroductionBoard onLoad={handleIntroBoardLoad} />}
              petMode={pet.mode}
              petVisible={!mobileScene}
              petPanelOpen={pet.panelOpen}
              onPetWake={pet.wake}
              windowRef={windowRef}
              petGreeting={pet.greeting && <button type="button" onClick={pet.wake} aria-label="点击宠物提问"
                className="relative w-52 cursor-pointer rounded-[3px_10px_4px_8px] border! border-[#929487]/50! bg-[#f5f4ed]/95! px-3 py-2 text-left text-[12px]! leading-relaxed! text-[#52584d]! shadow-[2px_3px_0_#454b4212] after:absolute after:-bottom-1.5 after:left-1/2 after:size-3 after:rotate-45 after:border-b after:border-r after:border-[#929487]/50 after:bg-[#f5f4ed] focus-visible:outline-1">
                {pet.greeting}
              </button>}
              petTrigger={<PaperPetTrigger onWake={pet.wake} />}
              petReply={<PaperPetReply sites={pet.sites} siteOrigin={pet.siteOrigin} mode={pet.mode} reply={pet.reply} recommendations={pet.recommendations}
                onAsk={pet.ask} onClose={pet.closePanel} />}
              petReplyPortal={petReplyPortal}
            />
          </Suspense>
        </Canvas>
      </div>
      <div ref={petReplyPortal}
        className={`${pet.panelOpen ? 'pointer-events-auto' : 'pointer-events-none'} fixed inset-0 z-45`} />
      {!mobileScene && hasEntered && !isReturningHome && !flightHintDismissed && portfolioPhase === 'idle' && !selectedProjectId && (
        <FlightGestureHint ref={attachFlightHint} />
      )}
      <PortfolioDetails enabled={hasEntered && !isReturningHome} selectedId={selectedProjectId} phase={portfolioPhase}
        onClose={closeProject} />

      {showEntranceContent && (
        <aside
          className="pointer-events-none fixed bottom-8 left-1/2 z-30 w-[min(23rem,calc(100vw-2rem))] -translate-x-1/2 px-7 py-3 text-center font-sans text-[0.8rem] leading-[1.35] text-[#3a3a36] drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)] max-[600px]:bottom-6 max-[600px]:px-5 max-[600px]:py-2.5 max-[600px]:text-[0.7rem]"
          aria-label="探索提示"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backgroundImage: `url("${assetFloorPaper}")`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            clipPath: 'polygon(0% 0%, 100% 0%, 98% 13%, 100% 25%, 97% 38%, 100% 50%, 98% 63%, 100% 78%, 97% 91%, 100% 100%, 88% 97%, 76% 100%, 64% 97%, 52% 100%, 40% 97%, 28% 100%, 16% 97%, 0% 100%, 2% 88%, 0% 75%, 3% 62%, 0% 49%, 2% 36%, 0% 23%, 3% 10%)',
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 0 0 L 100 0 L 98 13 L 100 25 L 97 38 L 100 50 L 98 63 L 100 78 L 97 91 L 100 100 L 88 97 L 76 100 L 64 97 L 52 100 L 40 97 L 28 100 L 16 97 L 0 100 L 2 88 L 0 75 L 3 62 L 0 49 L 2 36 L 0 23 L 3 10 L 0 0 Z"
              fill="none"
              stroke="rgba(26, 26, 26, 0.7)"
              strokeWidth="0.55"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="relative z-1 block font-sans text-[0.92rem] font-bold uppercase tracking-[0.04em] text-[#1a1a1a] max-[600px]:text-[0.8rem]">
            探索
          </span>
          <span className="relative z-1 block">
            点击物品进行交互,点击门进入作品集空中走廊
          </span>
        </aside>
      )}


    </main>
    </SiteShell>
  );
}
