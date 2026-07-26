import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmbedPlayerControls from '@/components/EmbedPlayerControls';
import {
  focusEmbedIframe,
  postEmbedCommand,
  supportsEmbedPostMessage,
  type EmbedCommandAction,
} from '@/utils/embedCommands';

type Props = {
  src: string;
  originalUrl?: string;
  poster?: string | null;
  title?: string;
};

export default function IframePlayer({ src, originalUrl, poster, title }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [started, setStarted] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setShowFallback(false);
    setStarted(false);
    setIframeKey((key) => key + 1);
    document.body.classList.remove('rc-cinema');
  }, [src]);

  const toggleFrameFullscreen = useCallback(async () => {
    const frame = frameRef.current;
    if (!frame) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      document.body.classList.remove('rc-cinema');
      return;
    }

    try {
      await frame.requestFullscreen?.();
    } catch {
      document.body.classList.toggle('rc-cinema');
    }
  }, []);

  useEffect(() => {
    if (!started) return;

    const t = window.setTimeout(() => {
      // Many hosts block embedding (X-Frame-Options/CSP). We can't force it,
      // but we can give the user a safe fallback.
      setShowFallback(true);
    }, 6000);

    return () => window.clearTimeout(t);
  }, [src, started]);

  useEffect(() => {
    const startFromRemote = () => {
      setStarted(true);
      window.setTimeout(() => {
        focusEmbedIframe();
        postEmbedCommand('play');
      }, 350);
    };
    window.addEventListener('rynex:embed-play', startFromRemote);
    return () => window.removeEventListener('rynex:embed-play', startFromRemote);
  }, []);

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: EmbedCommandAction; value?: number }>).detail;
      const action = detail?.action;
      if (!action) return;

      if (action === 'fullscreen') {
        void toggleFrameFullscreen();
        return;
      }

      if (action === 'reload') {
        setStarted(true);
        setLoaded(false);
        setShowFallback(false);
        setIframeKey((key) => key + 1);
        return;
      }

      if (!started && (action === 'play' || action === 'toggle')) {
        setStarted(true);
        window.setTimeout(() => postEmbedCommand(action, detail.value), 350);
        return;
      }

      focusEmbedIframe();
    };

    window.addEventListener('rynex:embed-command', handleCommand);
    window.addEventListener('rynex:embed-focus', focusEmbedIframe);
    return () => {
      window.removeEventListener('rynex:embed-command', handleCommand);
      window.removeEventListener('rynex:embed-focus', focusEmbedIframe);
      document.body.classList.remove('rc-cinema');
    };
  }, [started, toggleFrameFullscreen]);

  const openUrl = originalUrl || src;
  const passthroughControls = !supportsEmbedPostMessage(src);

  return (
    <div ref={frameRef} data-rc-frame className="relative w-full aspect-video bg-background rounded-xl overflow-hidden">
      {started ? (
        <iframe
          key={iframeKey}
          src={src}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <button
          data-rc-play
          type="button"
          onClick={() => setStarted(true)}
          aria-label="Reproduzir"
          className="group absolute inset-0 w-full h-full"
        >
          {poster && (
            <img
              src={poster}
              alt={title ? `Capa de ${title}` : 'Capa do vídeo'}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-current" />
            </span>
            {title && (
              <span className="font-display text-lg sm:text-xl text-foreground drop-shadow">{title}</span>
            )}
          </div>
        </button>
      )}

      {started && <EmbedPlayerControls active={started} title={title} passthrough={passthroughControls} />}

      {started && showFallback && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4">
          <div className="max-w-md w-full text-center space-y-3">
            <p className="text-sm text-foreground/80">
              Este provedor bloqueou reprodução incorporada neste site.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no provedor
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setStarted(false);
                  setShowFallback(false);
                  setLoaded(false);
                }}
              >
                <Play className="w-4 h-4" />
                Tentar novamente
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dica: use um link <strong>embed</strong> (ex.: /e/...) quando disponível.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
