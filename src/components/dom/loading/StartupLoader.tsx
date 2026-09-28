import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { reportStartupError, revealStartup, setStartupProgress } from '../../../utils/startup.ts';

interface StartupLoaderProps {
  ready: boolean;
  onComplete: () => void;
}

// Drives the HTML loading screen without re-rendering the scene on each download.
export default function StartupLoader({ ready, onComplete }: StartupLoaderProps) {
  const { active, loaded, total, errors } = useProgress();
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      document.fonts.load('650 16px tiktok'),
      document.fonts.load('400 16px mono'),
      document.fonts.load('400 16px tronica-mono'),
    ]).then(() => {
      if (cancelled) return;
      setStartupProgress('fonts', 1);
      setFontsReady(true);
    }).catch((error: unknown) => { if (!cancelled) reportStartupError(error); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (errors.length) reportStartupError(new Error(`Failed to load ${errors[0]}`));
    if (total > 0) setStartupProgress('assets', loaded / total);
  }, [loaded, total, errors]);

  useEffect(() => {
    if (!ready || !fontsReady || active || errors.length) return;
    let cancelled = false;
    revealStartup().then(() => { if (!cancelled) onComplete(); }).catch(reportStartupError);
    return () => { cancelled = true; };
  }, [ready, fontsReady, active, errors.length, onComplete]);

  return null;
}
