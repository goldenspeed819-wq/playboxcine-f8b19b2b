import { useEffect, useRef, useState } from 'react';
import {
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEmbedMediaBridge } from '@/hooks/useEmbedMediaBridge';
import { useOptionalRemoteControl } from '@/contexts/RemoteControlContext';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const total = Math.floor(value);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

type Props = { active: boolean; title?: string; passthrough?: boolean };

export default function EmbedPlayerControls({ active, title, passthrough = false }: Props) {
  const { canReadState, state, send } = useEmbedMediaBridge(active);
  const remote = useOptionalRemoteControl();
  const [speed, setSpeed] = useState(1);
  const [seeking, setSeeking] = useState<number | null>(null);
  const speedRef = useRef(1);
  const stateRef = useRef(state);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!active || !remote) return;
    return remote.registerPlayer({
      togglePlay: () => send('toggle'),
      play: () => send('play'),
      pause: () => send('pause'),
      seek: (seconds) => send('seek', seconds),
      seekTo: (seconds) => send('seekTo', seconds),
      setVolume: (volume) => send('volume', volume),
      volumeDelta: (delta) => {
        const next = Math.min(1, Math.max(0, stateRef.current.volume + delta));
        send('volume', next);
      },
      toggleMute: () => send('mute'),
      toggleFullscreen: () => send('fullscreen'),
      togglePiP: () => send('fullscreen'),
      setSpeed: (nextSpeed) => {
        speedRef.current = nextSpeed;
        setSpeed(nextSpeed);
        send('rate', nextSpeed);
      },
      skipIntro: () => send('seek', 85),
      next: () => {},
      getState: () => ({
        title,
        isPlaying: stateRef.current.paused === false,
        currentTime: stateRef.current.currentTime,
        duration: stateRef.current.duration,
        volume: stateRef.current.volume,
        isMuted: stateRef.current.muted,
        isFullscreen: !!document.fullscreenElement || document.body.classList.contains('rc-cinema'),
        speed: speedRef.current,
        hasNext: false,
        hasIntro: false,
      }),
    });
  }, [active, remote, send, title]);

  if (!active) return null;

  const isPlaying = state.paused === false;
  const duration = state.duration || 0;
  const current = seeking ?? state.currentTime;
  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const controlTabIndex = passthrough ? -1 : undefined;

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4',
        passthrough
          ? 'pointer-events-none min-h-20 bg-background pt-4 shadow-2xl'
          : 'bg-gradient-to-t from-background/95 via-background/80 to-transparent pt-10',
      )}
    >
      {title && (
        <p className="mb-1 truncate font-display text-sm tracking-wide text-foreground/80">{title}</p>
      )}

      <Slider
        value={[duration > 0 ? current : 0]}
        max={duration > 0 ? duration : 100}
        step={1}
        onValueChange={([v]) => setSeeking(v)}
        onValueCommit={([v]) => {
          setSeeking(null);
          if (!passthrough) send('seekTo', v);
        }}
        disabled={passthrough}
        className="cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary"
        aria-label="Progresso do vídeo"
      />

      <div className={cn('mt-2 flex items-center', passthrough ? 'gap-4 sm:gap-5' : 'gap-2 sm:gap-3')}>
        <Button
          type="button"
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          onClick={passthrough ? undefined : () => send('toggle')}
          tabIndex={controlTabIndex}
          className="flex h-10 w-10 rounded-full p-0 transition hover:scale-105"
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Voltar 10 segundos"
          onClick={passthrough ? undefined : () => send('seek', -10)}
          tabIndex={controlTabIndex}
          className="h-9 w-9 rounded-full text-foreground/80 transition hover:text-primary"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Avançar 10 segundos"
          onClick={passthrough ? undefined : () => send('seek', 10)}
          tabIndex={controlTabIndex}
          className="h-9 w-9 rounded-full text-foreground/80 transition hover:text-primary"
        >
          <RotateCw className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={state.muted ? 'Ativar som' : 'Silenciar'}
            onClick={passthrough ? undefined : () => send('mute')}
            tabIndex={controlTabIndex}
            className="h-9 w-9 rounded-full text-foreground/80 transition hover:text-primary"
          >
            {state.muted || state.volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Slider
            value={[state.muted ? 0 : Math.round((state.volume ?? 1) * 100)]}
            max={100}
            step={1}
            onValueChange={([v]) => {
              if (!passthrough) send('volume', v / 100);
            }}
            disabled={passthrough}
            className={cn('hidden cursor-pointer sm:flex', passthrough ? 'w-16' : 'w-24')}
            aria-label="Volume"
          />
        </div>

        <span className="ml-1 whitespace-nowrap text-xs text-foreground/70">
          {passthrough ? 'Rynex' : canReadState ? `${formatTime(current)} ${duration > 0 ? `/ ${formatTime(duration)}` : ''}` : 'Embed'}
        </span>

        <div className={cn('ml-auto flex items-center', passthrough ? 'gap-5 sm:gap-6' : 'gap-2 sm:gap-3')}>
          <Button
            type="button"
            variant="ghost"
            aria-label="Velocidade de reprodução"
            onClick={() => {
              if (passthrough) return;
              const next = SPEEDS[(SPEEDS.indexOf(speedRef.current) + 1) % SPEEDS.length];
              setSpeed(next);
              send('rate', next);
            }}
            tabIndex={controlTabIndex}
            className={cn(
              'rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground/80 transition hover:border-primary hover:text-primary',
              speed !== 1 && 'border-primary text-primary',
            )}
          >
            {speed}x
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tela cheia"
            onClick={passthrough ? undefined : () => send('fullscreen')}
            tabIndex={controlTabIndex}
            className="h-9 w-9 rounded-full text-foreground/80 transition hover:text-primary"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        aria-hidden
        className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-muted sm:hidden"
      >
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}