import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  focusEmbedIframe,
  postEmbedCommand,
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

  // Verifica se a URL é um fluxo de vídeo direto ou proxy MP4/HLS
  const isDirectVideo =
    src?.includes('/api/stream') ||
    src?.includes('.mp4') ||
    src?.includes('.m3u8') ||
    src?.includes('.mkv');

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

  // Timer de Fallback estendido para 12 segundos para evitar falsos bloqueios
  useEffect(() => {
    if (!started || loaded) return;

    const t = window.setTimeout(() => {
      setShowFallback(true);
    }, 12000); // 12 segundos

    return () => window.clearTimeout(t);
  }, [src, started, loaded]);

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
    };
  }, [started, toggleFrameFullscreen]);

  const openUrl = originalUrl || src;

  return (
    <div ref={frameRef} data-rc-frame className="relative w-full aspect-video bg-background rounded-xl overflow-hidden">
      {started ? (
        isDirectVideo ? (
          /* Renderiza Tag de Vídeo Nativa se for Proxy / MP4 */
          <video
            key={iframeKey}
            src={src}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            onLoadedData={() => setLoaded(true)}
            onCanPlay={() => setLoaded(true)}
          />
        ) : (
          /* Renderiza Iframe para Players Externos / Embeds */
          <iframe
            key={iframeKey}
            src={src}
            title={title || 'Player de vídeo'}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        )
      ) : (
        /* Capa / Botão de Play Inicial */
        <button
          data-rc-play
          type="button"
          onClick={() => setStarted(true)}
          aria-label={title ? `Reproduzir ${title}` : 'Reproduzir vídeo'}
          className="group absolute inset-0 w-full h-full text-left"
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

      {/* Overlay de Fallback (Aviso de Bloqueio) com opção de Fechar */}
      {started && showFallback && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-4 z-20">
          <div className="max-w-md w-full text-center space-y-3 relative">
            <p className="text-sm text-foreground/80">
              O provedor está demorando para responder ou bloqueou a execução incorporada.
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
                  setStarted(true);
                  setShowFallback(false);
                  setLoaded(false);
                  setIframeKey((k) => k + 1);
                }}
              >
                <Play className="w-4 h-4" />
                Tentar novamente
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground"
                onClick={() => setShowFallback(false)}
              >
                <X className="w-3 h-3" />
                Fechar aviso e aguardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}