import { useCallback, useEffect, useRef, useState } from 'react';
import { dispatchEmbedCommand, postEmbedCommand, type EmbedCommandAction } from '@/utils/embedCommands';

export interface EmbedMediaState {
  paused: boolean | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
}

type MediaAction =
  | 'state'
  | 'play'
  | 'pause'
  | 'toggle'
  | 'seek'
  | 'seekTo'
  | 'volume'
  | 'mute'
  | 'rate'
  | 'fullscreen'
  | 'reload';

const EMPTY: EmbedMediaState = {
  paused: null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
};

export function useEmbedMediaBridge(active: boolean) {
  const [canReadState, setCanReadState] = useState(false);
  const [state, setState] = useState<EmbedMediaState>(EMPTY);
  const seenAt = useRef(0);

  const send = useCallback((action: MediaAction, value?: number) => {
    dispatchEmbedCommand(action as EmbedCommandAction, value);

    setState((prev) => {
      if (action === 'play') return { ...prev, paused: false };
      if (action === 'pause') return { ...prev, paused: true };
      if (action === 'toggle') return { ...prev, paused: prev.paused === false };
      if (action === 'seek') return { ...prev, currentTime: Math.max(0, prev.currentTime + (value ?? 0)) };
      if (action === 'seekTo') return { ...prev, currentTime: Math.max(0, value ?? 0) };
      if (action === 'volume') return { ...prev, volume: Math.min(1, Math.max(0, value ?? prev.volume)), muted: false };
      if (action === 'mute') return { ...prev, muted: !prev.muted };
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!active) return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data || {};
      if (data.source !== 'rynex-extension') return;
      if (data.type === 'RYNEX_EXTENSION_STATUS') {
        seenAt.current = Date.now();
        return;
      }
      if (data.type !== 'RYNEX_REMOTE_ACK' || data.input !== 'media') return;
      seenAt.current = Date.now();
      const s = data.state;
      if (s && typeof s === 'object') {
        setCanReadState(true);
        setState({
          paused: typeof s.paused === 'boolean' ? s.paused : null,
          currentTime: Number(s.currentTime) || 0,
          duration: Number(s.duration) || 0,
          volume: typeof s.volume === 'number' ? s.volume : 1,
          muted: Boolean(s.muted),
        });
      }
    };

    window.addEventListener('message', onMessage);
    send('state');
    const poll = window.setInterval(() => {
      postEmbedCommand('state');
      if (seenAt.current && Date.now() - seenAt.current > 6000) setCanReadState(false);
    }, 800);

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(poll);
    };
  }, [active, send]);

  useEffect(() => {
    if (!active) return;

    const onProviderMessage = (event: MessageEvent) => {
      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== 'object') return;

      const data = payload as Record<string, any>;
      const info = typeof data.info === 'object' && data.info ? data.info : data.data;
      if (info && typeof info === 'object') {
        const currentTime = Number(info.currentTime ?? info.seconds ?? info.position);
        const duration = Number(info.duration);
        const volume = Number(info.volume);
        setCanReadState(true);
        setState((prev) => ({
          paused:
            data.event === 'pause' || data.event === 'paused'
              ? true
              : data.event === 'play' || data.event === 'playing' || data.info?.playerState === 1
                ? false
                : data.info?.playerState === 2
                  ? true
                  : prev.paused,
          currentTime: Number.isFinite(currentTime) ? currentTime : prev.currentTime,
          duration: Number.isFinite(duration) ? duration : prev.duration,
          volume: Number.isFinite(volume) ? volume : prev.volume,
          muted: prev.muted,
        }));
      }
    };

    window.addEventListener('message', onProviderMessage);
    return () => window.removeEventListener('message', onProviderMessage);
  }, [active]);

  return { canReadState, state, send };
}