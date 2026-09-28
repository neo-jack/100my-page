import assetBgm from '../../public/bgm.mp3?url';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface AudioContextType {
    isMuted: boolean;
    globalVolume: number;
    bgmOn: boolean;
    toggleBgm: () => void;
}

const AudioContext = createContext<AudioContextType>({
    isMuted: false,
    globalVolume: 0.5,
    bgmOn: false,
    toggleBgm: () => undefined,
});

export const useAudio = () => useContext(AudioContext);

interface AudioProviderProps {
    children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
    const [isMuted] = useState<boolean>(() => {
        const saved = localStorage.getItem('audio_muted');
        return saved === 'true';
    });

    const [globalVolume] = useState<number>(() => {
        const saved = localStorage.getItem('audio_volume');
        return saved !== null ? parseFloat(saved) : 0.5;
    });

    const [bgmOn, setBgmOn] = useState(false);
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    const toggleBgm = useCallback(() => {
        if (!bgmRef.current) {
            bgmRef.current = new Audio(assetBgm);
            bgmRef.current.loop = true;
            bgmRef.current.volume = 0.3;
        }

        if (bgmOn) {
            bgmRef.current.pause();
            setBgmOn(false);
            return;
        }

        bgmRef.current.play()
            .then(() => setBgmOn(true))
            .catch(() => setBgmOn(false));
    }, [bgmOn]);

    useEffect(() => () => {
        bgmRef.current?.pause();
    }, []);

    return (
        <AudioContext.Provider value={{ isMuted, globalVolume, bgmOn, toggleBgm }}>
            {children}
        </AudioContext.Provider>
    );
};
