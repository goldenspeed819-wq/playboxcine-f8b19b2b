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
import RemoteCursor from '@/components/RemoteCursor';

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
  | 'quickImport'
  | 'pointerMove'
  | 'pointerTap'
  | 'pointerDoubleTap'
  | 'pointerRightTap'
  | 'pointerScroll'
  | 'pointerCenter'
  | 'key'
  | 'embedPlay'
  | 'cinema';

export interface RemoteCommand {
  action: RemoteAction;
  value?: number | string;
  path?: string;
  dx?: number;
  dy?: number;
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

  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, pressed: false });
  const cursorRef = useRef({ x: 0, y: 0 });
  const hideTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);

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

  // ---- Virtual pointer (touchpad mode, works over iframes too) -------------
  const showCursor = useCallback((x: number, y: number) => {
    cursorRef.current = { x, y };
    setCursor((prev) => ({ ...prev, x, y, visible: true }));
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(
      () => setCursor((prev) => ({ ...prev, visible: false })),
      6000,
    );
  }, []);

  const dispatchHardwareInput = useCallback(
    (payload: { input: 'move' | 'click' | 'doubleClick' | 'rightClick' | 'scroll'; x?: number; y?: number; dy?: number }) => {
      window.postMessage(
        {
          source: 'rynex-cine',
          type: 'RYNEX_REMOTE_INPUT',
          ...payload,
        },
        window.location.origin,
      );
    },
    [],
  );

  const movePointer = useCallback(
    (dx: number, dy: number) => {
      const { x, y } = cursorRef.current;
      const nextX = Math.min(window.innerWidth - 2, Math.max(0, (x || window.innerWidth / 2) + dx));
      const nextY = Math.min(window.innerHeight - 2, Math.max(0, (y || window.innerHeight / 2) + dy));
      showCursor(nextX, nextY);

      const target = document.elementFromPoint(nextX, nextY);
      if (target) {
        const opts = { bubbles: true, cancelable: true, clientX: nextX, clientY: nextY } as MouseEventInit;
        target.dispatchEvent(new MouseEvent('mousemove', opts));
        target.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerType: 'mouse' }));
      }
      dispatchHardwareInput({ input: 'move', x: nextX, y: nextY });
    },
    [dispatchHardwareInput, showCursor],
  );

  const flashPress = useCallback(() => {
    setCursor((prev) => ({ ...prev, pressed: true }));
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(
      () => setCursor((prev) => ({ ...prev, pressed: false })),
      180,
    );
  }, []);

  const clickPointer = useCallback(
    (kind: 'tap' | 'double' | 'right') => {
      const { x, y } = cursorRef.current;
      const px = x || window.innerWidth / 2;
      const py = y || window.innerHeight / 2;
      showCursor(px, py);
      flashPress();

      const stack = (document.elementsFromPoint(px, py) as HTMLElement[]).filter(
        (el) => !el.closest('[data-rc-cursor]'),
      );
      const target = stack[0];
      if (!target) return;

      const isIframeHit = stack.some((el) => el.tagName === 'IFRAME');
      const isFrameAreaHit = stack.some((el) => Boolean(el.closest('[data-rc-frame]')));

      const base = { bubbles: true, cancelable: true, clientX: px, clientY: py, view: window };

      if (kind === 'right') {
        target.dispatchEvent(new MouseEvent('contextmenu', { ...base, button: 2 }));
        if (isIframeHit || isFrameAreaHit) dispatchHardwareInput({ input: 'rightClick', x: px, y: py });
        return;
      }

      target.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerType: 'mouse', isPrimary: true }));
      target.dispatchEvent(new MouseEvent('mousedown', base));
      target.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerType: 'mouse', isPrimary: true }));
      target.dispatchEvent(new MouseEvent('mouseup', base));
      target.dispatchEvent(new MouseEvent('click', base));
      if (kind === 'double') target.dispatchEvent(new MouseEvent('dblclick', base));

      // Native click on the nearest interactive ancestor — covers overlays/buttons
      // whose handlers ignore synthetic mouse events.
      const selector = 'button, a, [role="button"], input, select, textarea, [tabindex], summary';
      const clickable =
        (target.closest(selector) as HTMLElement | null) ??
        (stack.map((el) => el.closest(selector)).find(Boolean) as HTMLElement | null);
      if (clickable) {
        clickable.focus?.();
        if (kind === 'tap' || kind === 'double') clickable.click();
      }

      if (isIframeHit || (isFrameAreaHit && !clickable)) {
        dispatchHardwareInput({ input: kind === 'double' ? 'doubleClick' : 'click', x: px, y: py });
      }
    },
    [dispatchHardwareInput, flashPress, showCursor],
  );

  /** Clicks the Rynex play overlay of the current player (works for embeds too). */
  const pressPlayOverlay = useCallback(() => {
    const overlay =
      (document.querySelector('[data-rc-frame] button[aria-label="Reproduzir"]') as HTMLElement | null) ??
      (document.querySelector('button[aria-label="Reproduzir"]') as HTMLElement | null) ??
      (document.querySelector('[data-rc-play]') as HTMLElement | null);
    if (overlay) {
      overlay.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const rect = overlay.getBoundingClientRect();
      showCursor(rect.left + rect.width / 2, rect.top + rect.height / 2);
      flashPress();
      overlay.click();
      return;
    }
    const iframe = document.querySelector('[data-rc-frame] iframe') as HTMLIFrameElement | null;
    if (iframe) {
      const rect = iframe.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      showCursor(x, y);
      flashPress();
      iframe.focus();
      dispatchHardwareInput({ input: 'click', x, y });
      toast({
        title: 'Clique enviado para o embed',
        description: 'Para clicar dentro de players externos, use a extensão Rynex atualizada no PC.',
      });
      return;
    }
    playerRef.current?.togglePlay();
  }, [dispatchHardwareInput, flashPress, showCursor]);

  const scrollPointer = useCallback(
    (dy: number) => {
      const { x, y } = cursorRef.current;
      const px = x || window.innerWidth / 2;
      const py = y || window.innerHeight / 2;
      const target = document.elementFromPoint(px, py);
      target?.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: px, clientY: py, deltaY: dy }),
      );
      const isFrameAreaHit = target instanceof HTMLElement && Boolean(target.closest('[data-rc-frame]'));
      if (isFrameAreaHit || target?.tagName === 'IFRAME') dispatchHardwareInput({ input: 'scroll', x: px, y: py, dy });
      window.scrollBy({ top: dy, behavior: 'auto' });
    },
    [dispatchHardwareInput],
  );

  const sendKey = useCallback((key: string) => {
    const iframe = document.querySelector('[data-rc-frame] iframe') as HTMLIFrameElement | null;
    iframe?.focus();
    const target: EventTarget = iframe ?? document.activeElement ?? document.body;
    const init: KeyboardEventInit = { key, code: key, bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent('keydown', init));
    target.dispatchEvent(new KeyboardEvent('keyup', init));
  }, []);

  const toggleCinema = useCallback(() => {
    const frame = document.querySelector('[data-rc-frame]');
    if (!frame) {
      toast({ title: 'Nenhum player externo nesta tela' });
      return;
    }
    document.body.classList.toggle('rc-cinema');
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
        case 'pointerMove':
          movePointer(command.dx ?? 0, command.dy ?? 0);
          break;
        case 'pointerTap':
          clickPointer('tap');
          break;
        case 'pointerDoubleTap':
          clickPointer('double');
          break;
        case 'pointerRightTap':
          clickPointer('right');
          break;
        case 'pointerScroll':
          scrollPointer(command.dy ?? numberValue ?? 0);
          break;
        case 'pointerCenter':
          showCursor(window.innerWidth / 2, window.innerHeight / 2);
          break;
        case 'key':
          sendKey(String(command.value ?? ''));
          break;
        case 'embedPlay':
          pressPlayOverlay();
          break;
        case 'cinema':
          toggleCinema();
          break;
        default:
          break;
      }

      setTimeout(sendState, 120);
    },
    [
      clickPointer,
      movePointer,
      navigate,
      pressPlayOverlay,
      scrollPointer,
      sendKey,
      sendState,
      showCursor,
      toggleCinema,
    ],
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

  return (
    <RemoteControlContext.Provider value={value}>
      {children}
      <RemoteCursor x={cursor.x} y={cursor.y} visible={cursor.visible} pressed={cursor.pressed} />
    </RemoteControlContext.Provider>
  );
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