import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type RemoteAction =
  | 'hello'
  | 'togglePlay'
  | 'play'
  | 'pause'
  | 'seek'
  | 'seekTo'
  | 'volume'
  | 'volumeDelta'
  | 'toggleMute'
  | 'toggleFullscreen'
  | 'togglePiP'
  | 'speed'
  | 'skipIntro'
  | 'next'
  | 'goto'
  | 'back'
  | 'reload'
  | 'quickImport';

export interface RemoteCommand {
  action: RemoteAction;
  value?: number | string;
  path?: string;
  payload?: Record<string, unknown>;
}

export interface RemotePlayerState {
  title?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  speed: number;
  hasNext: boolean;
  hasIntro: boolean;
}

export interface RemotePlayerApi {
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  volumeDelta: (delta: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
  setSpeed: (speed: number) => void;
  skipIntro: () => void;
  next: () => void;
  getState: () => RemotePlayerState;
}

interface RemoteControlContextValue {
  code: string;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  regenerateCode: () => void;
  isHostConnected: boolean;
  registerPlayer: (api: RemotePlayerApi) => () => void;
}

const RemoteControlContext = createContext<RemoteControlContextValue | null>(null);

const CODE_KEY = 'rynex-remote-code';
const ENABLED_KEY = 'rynex-remote-enabled';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateRemoteCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export const remoteChannelName = (code: string) => `rynex-remote-${code.trim().toUpperCase()}`;

export function RemoteControlProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(() => {
    const stored = localStorage.getItem(CODE_KEY);
    if (stored && stored.length === 6) return stored;
    const fresh = generateRemoteCode();
    localStorage.setItem(CODE_KEY, fresh);
    return fresh;
  });
  const [enabled, setEnabledState] = useState(() => localStorage.getItem(ENABLED_KEY) !== 'false');
  const [isHostConnected, setIsHostConnected] = useState(false);

  const playerRef = useRef<RemotePlayerApi | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const registerPlayer = useCallback((api: RemotePlayerApi) => {
    playerRef.current = api;
    return () => {
      if (playerRef.current === api) playerRef.current = null;
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    localStorage.setItem(ENABLED_KEY, String(value));
    setEnabledState(value);
  }, []);

  const regenerateCode = useCallback(() => {
    const fresh = generateRemoteCode();
    localStorage.setItem(CODE_KEY, fresh);
    setCode(fresh);
  }, []);

  const sendState = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    const player = playerRef.current;
    channel.send({
      type: 'broadcast',
      event: 'state',
      payload: {
        page: window.location.pathname,
        hasPlayer: !!player,
        player: player ? player.getState() : null,
      },
    });
  }, []);

  const handleCommand = useCallback(
    (command: RemoteCommand) => {
      const player = playerRef.current;
      const numberValue = typeof command.value === 'number' ? command.value : Number(command.value);

      switch (command.action) {
        case 'hello':
          break;
        case 'goto':
          if (command.path) navigate(command.path);
          break;
        case 'back':
          navigate(-1);
          break;
        case 'reload':
          window.location.reload();
          break;
        case 'quickImport': {
          const payload = encodeURIComponent(JSON.stringify(command.payload ?? {}));
          navigate(`/admin/quick-import?rc=${payload}`);
          toast({ title: 'Importação recebida do controle remoto' });
          break;
        }
        case 'togglePlay':
          player?.togglePlay();
          break;
        case 'play':
          player?.play();
          break;
        case 'pause':
          player?.pause();
          break;
        case 'seek':
          player?.seek(numberValue || 0);
          break;
        case 'seekTo':
          player?.seekTo(numberValue || 0);
          break;
        case 'volume':
          player?.setVolume(numberValue || 0);
          break;
        case 'volumeDelta':
          player?.volumeDelta(numberValue || 0);
          break;
        case 'toggleMute':
          player?.toggleMute();
          break;
        case 'toggleFullscreen':
          player?.toggleFullscreen();
          break;
        case 'togglePiP':
          player?.togglePiP();
          break;
        case 'speed':
          player?.setSpeed(numberValue || 1);
          break;
        case 'skipIntro':
          player?.skipIntro();
          break;
        case 'next':
          player?.next();
          break;
        default:
          break;
      }

      setTimeout(sendState, 120);
    },
    [navigate, sendState],
  );

  useEffect(() => {
    if (!enabled) {
      setIsHostConnected(false);
      return;
    }

    const channel = supabase.channel(remoteChannelName(code), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'cmd' }, ({ payload }) => handleCommand(payload as RemoteCommand))
      .subscribe((status) => setIsHostConnected(status === 'SUBSCRIBED'));

    const interval = window.setInterval(sendState, 1500);

    return () => {
      window.clearInterval(interval);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [code, enabled, handleCommand, sendState]);

  const value = useMemo(
    () => ({ code, enabled, setEnabled, regenerateCode, isHostConnected, registerPlayer }),
    [code, enabled, setEnabled, regenerateCode, isHostConnected, registerPlayer],
  );

  return <RemoteControlContext.Provider value={value}>{children}</RemoteControlContext.Provider>;
}

export function useRemoteControl() {
  const ctx = useContext(RemoteControlContext);
  if (!ctx) throw new Error('useRemoteControl must be used inside RemoteControlProvider');
  return ctx;
}

/** Optional access — safe for components that can render outside the provider. */
export function useOptionalRemoteControl() {
  return useContext(RemoteControlContext);
}