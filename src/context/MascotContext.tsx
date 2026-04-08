import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type MascotMood = 'idle' | 'happy' | 'urgent' | 'celebrating';

interface MascotMessage {
  text: string;
  priority: 'high' | 'normal';
}

interface MascotContextType {
  currentMessage: string | null;
  mood: MascotMood;
  isVisible: boolean;
  isMinimized: boolean;
  pushMessage: (text: string, priority?: 'high' | 'normal', mood?: MascotMood) => void;
  dismissMessage: () => void;
  setMood: (mood: MascotMood) => void;
  toggleMinimized: () => void;
}

const MascotContext = createContext<MascotContextType | null>(null);

export const useMascot = () => {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error('useMascot must be used inside MascotProvider');
  return ctx;
};

export const MascotProvider = ({ children }: { children: ReactNode }) => {
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [mood, setMoodState] = useState<MascotMood>('idle');
  const [isMinimized, setIsMinimized] = useState(false);
  const queueRef = useRef<MascotMessage[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const next = queueRef.current.shift();
    if (!next) {
      setCurrentMessage(null);
      setMoodState('idle');
      return;
    }

    setCurrentMessage(next.text);

    // Auto-dismiss after 6 seconds then show next
    timerRef.current = setTimeout(() => {
      showNext();
    }, 6000);
  }, []);

  const pushMessage = useCallback(
    (text: string, priority: 'high' | 'normal' = 'normal', newMood: MascotMood = 'happy') => {
      setMoodState(newMood);
      if (priority === 'high') {
        // High priority: clear queue and show immediately
        queueRef.current = [];
        if (timerRef.current) clearTimeout(timerRef.current);
        setCurrentMessage(text);
        timerRef.current = setTimeout(() => showNext(), 6000);
      } else {
        queueRef.current.push({ text, priority });
        // If nothing is showing, start immediately
        if (!currentMessage) {
          showNext();
        }
      }
    },
    [currentMessage, showNext]
  );

  const dismissMessage = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    showNext();
  }, [showNext]);

  const setMood = useCallback((m: MascotMood) => setMoodState(m), []);
  const toggleMinimized = useCallback(() => setIsMinimized((v) => !v), []);

  return (
    <MascotContext.Provider
      value={{
        currentMessage,
        mood,
        isVisible: true,
        isMinimized,
        pushMessage,
        dismissMessage,
        setMood,
        toggleMinimized,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
};
