import { useCallback, useEffect, useRef, useState } from 'react';

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
  | 'fullscreen';

const EMPTY: EmbedMediaState = {
  paused: null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
};

/**
 * Ponte com a extensão Rynex: manipula o <video>/Video.js dentro do iframe
 * externo (RedeCanais) e devolve o estado para o player do Rynex.
 */
export function useEmbedMediaBridge(active: boolean) {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<EmbedMediaState>(EMPTY);
  const seenAt = useRef(0);

  const send = useCallback((action: MediaAction, value?: number) => {
    window.postMessage(
      {
        source: 'rynex-cine',
        type: 'RYNEX_REMOTE_INPUT',
        requestId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        input: 'media',
        action,
        value,
      },
      window.location.origin,
    );
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
        setAvailable(true);
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
      send('state');
      if (seenAt.current && Date.now() - seenAt.current > 6000) setAvailable(false);
    }, 800);

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(poll);
    };
  }, [active, send]);

  return { available, state, send };
}