import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Play } from 'lucide-react';
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
  onSwitchServer?: () => void;
};

const isDirectStreamUrl = (url?: string | null) =>
  !!url &&
  (url.includes('/api/stream') ||
    url.includes('/dynamic-proxy/') ||
    /\/stream\/\d+(\?|$)/i.test(url) ||
    /\.vercel\.app/i.test(url) ||
    /\.squareweb\.app/i.test(url) ||
    /\.(mp4|m3u8|mkv|webm|ogg|mpd)(\?|$)/i.test(url));

export default function IframePlayer({ src, originalUrl, poster, title, onSwitchServer }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [started, setStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [formatError, setFormatError] = useState(false);

  const isDirectStream = isDirectStreamUrl(src);

  useEffect(() => {
    setLoaded(false);
    setShowFallback(false);
    setStarted(false);
    setBuffering(false);
    setFormatError(false);
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

  // Smart autoplay: try with sound, fall back to muted if the browser blocks it.
  const playNativeVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = false;
      await video.play();
    } catch {
      try {
        video.muted = true;
        await video.play();
      } catch {
        // Autoplay fully blocked; user can press the native play button.
      }
    }
  }, []);

  // Fallback timer: disabled for direct streams, 15s for iframes.
  useEffect(() => {
    if (!started || isDirectStream) return;

    const t = window.setTimeout(() => {
      // Many hosts block embedding (X-Frame-Options/CSP). We can't force it,
      // but we can give the user a safe fallback.
      setShowFallback(true);
    }, 15000);

    return () => window.clearTimeout(t);
  }, [src, started, isDirectStream]);

  // Carregamento infinito em stream direto: após 20s travado, oferece troca.
  useEffect(() => {
    if (!started || !isDirectStream || !(buffering || !loaded) || formatError) return;
    const t = window.setTimeout(() => { setFormatError(true); }, 20000);
    return () => window.clearTimeout(t);
  }, [started, isDirectStream, buffering, loaded, formatError]);

  useEffect(() => {
    const startFromRemote = () => {
      setStarted(true);
      window.setTimeout(() => {
        if (isDirectStream) {
          void playNativeVideo();
        } else {
          focusEmbedIframe();
          postEmbedCommand('play');
        }
      }, 350);
    };
    window.addEventListener('rynex:embed-play', startFromRemote);
    return () => window.removeEventListener('rynex:embed-play', startFromRemote);
  }, [isDirectStream, playNativeVideo]);

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
        window.setTimeout(() => {
          if (isDirectStream) void playNativeVideo();
          else postEmbedCommand(action, detail.value);
        }, 350);
        return;
      }

      if (isDirectStream) {
        const video = videoRef.current;
        if (!video) return;
        if (action === 'play') void video.play();
        else if (action === 'pause') video.pause();
        else if (action === 'toggle') (video.paused ? void video.play() : video.pause());
        else if (action === 'seek' && typeof detail.value === 'number') video.currentTime = detail.value;
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
  }, [started, isDirectStream, toggleFrameFullscreen, playNativeVideo]);

  const openUrl = originalUrl || src;

  // "Continuar assistindo" / close fallback: hide the overlay, keep started,
  // and force native playback to resume.
  const handleContinueWatching = useCallback(() => {
    setShowFallback(false);
    setFormatError(false);
    setStarted(true);
    if (isDirectStream) {
      void playNativeVideo();
    }
  }, [isDirectStream, playNativeVideo]);

  return (
    <div ref={frameRef} data-rc-frame className="relative w-full max-w-full aspect-video bg-background rounded-xl overflow-hidden touch-manipulation">
      {started ? (
        isDirectStream ? (
          <>
            <video
              key={iframeKey}
              ref={videoRef}
              src={src}
              poster={poster || undefined}
              className="absolute inset-0 w-full h-full bg-background object-contain"
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
              onCanPlay={() => {
                setLoaded(true);
                setBuffering(false);
                void playNativeVideo();
              }}
              onLoadedData={() => setLoaded(true)}
              onPlaying={() => setBuffering(false)}
              onWaiting={() => setBuffering(true)}
              onStalled={() => setBuffering(true)}
              onError={() => { setFormatError(true); setBuffering(false); }}
            />
            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}
          </>
        ) : (
          <iframe
            key={iframeKey}
            src={src}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        )
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

      {started && formatError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 p-4">
          <div className="max-w-sm w-full text-center space-y-3">
            <p className="text-sm text-foreground">Este servidor não conseguiu reproduzir o vídeo (formato incompatível ou carregamento travado).</p>
            <div className="flex flex-wrap justify-center gap-2">
              {onSwitchServer && (
                <Button className="min-h-[44px]" onClick={onSwitchServer}>Trocar servidor</Button>
              )}
              <Button variant="outline" className="min-h-[44px]" onClick={() => { setFormatError(false); setLoaded(false); setIframeKey((k) => k + 1); }}>
                Tentar de novo
              </Button>
            </div>
          </div>
        </div>
      )}

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
              {onSwitchServer && (
                <Button className="gap-2" onClick={onSwitchServer}>Trocar servidor</Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleContinueWatching}
              >
                <Play className="w-4 h-4" />
                Continuar assistindo
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
