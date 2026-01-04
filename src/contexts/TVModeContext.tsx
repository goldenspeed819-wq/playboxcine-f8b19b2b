import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface TVModeContextType {
  isTVMode: boolean;
  setTVMode: (enabled: boolean) => void;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  registerFocusable: (id: string) => void;
  unregisterFocusable: (id: string) => void;
  focusableCount: number;
}

const TVModeContext = createContext<TVModeContextType | undefined>(undefined);

export const useTVMode = () => {
  const context = useContext(TVModeContext);
  if (!context) {
    throw new Error('useTVMode must be used within TVModeProvider');
  }
  return context;
};

interface TVModeProviderProps {
  children: ReactNode;
}

export const TVModeProvider = ({ children }: TVModeProviderProps) => {
  const [isTVMode, setIsTVMode] = useState(() => {
    const saved = localStorage.getItem('tvMode');
    return saved === 'true';
  });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [focusables, setFocusables] = useState<string[]>([]);

  const setTVMode = useCallback((enabled: boolean) => {
    setIsTVMode(enabled);
    localStorage.setItem('tvMode', String(enabled));
  }, []);

  const registerFocusable = useCallback((id: string) => {
    setFocusables(prev => [...prev, id]);
  }, []);

  const unregisterFocusable = useCallback((id: string) => {
    setFocusables(prev => prev.filter(f => f !== id));
  }, []);

  // Global keyboard navigation for TV mode
  useEffect(() => {
    if (!isTVMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(focusables.length - 1, prev + 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(focusables.length - 1, prev + 1));
          break;
        case 'Enter':
        case ' ':
          // Let the focused element handle this
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTVMode, focusables.length]);

  return (
    <TVModeContext.Provider value={{
      isTVMode,
      setTVMode,
      focusedIndex,
      setFocusedIndex,
      registerFocusable,
      unregisterFocusable,
      focusableCount: focusables.length
    }}>
      {children}
    </TVModeContext.Provider>
  );
};
