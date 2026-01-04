import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface TVModeContextType {
  isTVMode: boolean;
  setTVMode: (enabled: boolean) => void;
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

  const setTVMode = useCallback((enabled: boolean) => {
    setIsTVMode(enabled);
    localStorage.setItem('tvMode', String(enabled));
  }, []);

  return (
    <TVModeContext.Provider value={{ isTVMode, setTVMode }}>
      {children}
    </TVModeContext.Provider>
  );
};
