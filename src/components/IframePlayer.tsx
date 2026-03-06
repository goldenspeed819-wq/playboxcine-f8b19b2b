import { useEffect, useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  src: string;
  originalUrl?: string;
};

/**
 * Check if a URL belongs to a provider known to block iframe/sandbox embedding.
 */
function isAntiSandboxProvider(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('redecanais');
  } catch {
    return false;
  }
}

export default function IframePlayer({ src, originalUrl }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const openUrl = originalUrl || src;
  const blocked = isAntiSandboxProvider(src);

  useEffect(() => {
    setLoaded(false);
    setShowFallback(false);

    if (blocked) return;

    const t = window.setTimeout(() => {
      setShowFallback(true);
    }, 6000);

    return () => window.clearTimeout(t);
  }, [src, blocked]);

  // For providers that block sandbox/iframe, show direct open button
  if (blocked) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4 p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-white/80">
            Clique para assistir. O vídeo será aberto em uma nova aba.
          </p>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            Assistir Agora
          </Button>
        </div>
      </div>
    );
  }

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
