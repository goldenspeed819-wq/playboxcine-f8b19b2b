import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  src: string;
  originalUrl?: string;
};

export default function IframePlayer({ src, originalUrl }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setShowFallback(false);

    const t = window.setTimeout(() => {
      // Many hosts block embedding (X-Frame-Options/CSP). We can't force it,
      // but we can give the user a safe fallback.
      setShowFallback(true);
    }, 6000);

    return () => window.clearTimeout(t);
  }, [src]);

  const openUrl = originalUrl || src;

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        src={src}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />

      {showFallback && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-md w-full text-center space-y-3">
            <p className="text-sm text-white/80">
              Este provedor bloqueou reprodução incorporada neste site.
            </p>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no provedor
            </Button>
            <p className="text-xs text-white/50">
              Dica: use um link <strong>embed</strong> (ex.: /e/...) quando disponível.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
