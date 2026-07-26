import { useEffect, useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmbedPlayerControls from '@/components/EmbedPlayerControls';

type Props = {
  src: string;
  originalUrl?: string;
  poster?: string | null;
  title?: string;
};

export default function IframePlayer({ src, originalUrl, poster, title }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setShowFallback(false);
    setStarted(false);
  }, [src]);

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
    const startFromRemote = () => setStarted(true);
    window.addEventListener('rynex:embed-play', startFromRemote);
    return () => window.removeEventListener('rynex:embed-play', startFromRemote);
  }, []);

  const openUrl = originalUrl || src;

  return (
    <div data-rc-frame className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      {started ? (
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
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

      {started && <EmbedPlayerControls active={started} title={title} />}

      {started && showFallback && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-md w-full text-center space-y-3">
            <p className="text-sm text-white/80">
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
            <p className="text-xs text-white/50">
              Dica: use um link <strong>embed</strong> (ex.: /e/...) quando disponível.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
