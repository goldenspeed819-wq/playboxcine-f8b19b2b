import { useState, useEffect } from 'react';
import { X, ExternalLink, MousePointer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ad {
  id: string;
  imageUrl: string;
  targetUrl: string;
  title?: string;
}

interface AdOverlayProps {
  onComplete: () => void;
  requiredClicks?: number;
}

// Configuração dos anúncios - você pode adicionar seus próprios anúncios aqui
// Para integrar com uma rede de anúncios, substitua este array pela resposta da API
const ADS: Ad[] = [
  {
    id: 'ad1',
    imageUrl: 'https://via.placeholder.com/728x90/1a1a2e/e94560?text=Seu+Anuncio+Aqui+1',
    targetUrl: 'https://example.com/ad1',
    title: 'Anúncio 1'
  },
  {
    id: 'ad2',
    imageUrl: 'https://via.placeholder.com/728x90/16213e/0f3460?text=Seu+Anuncio+Aqui+2',
    targetUrl: 'https://example.com/ad2',
    title: 'Anúncio 2'
  },
  {
    id: 'ad3',
    imageUrl: 'https://via.placeholder.com/300x250/1a1a2e/e94560?text=Anuncio+Banner',
    targetUrl: 'https://example.com/ad3',
    title: 'Anúncio 3'
  }
];

export function AdOverlay({ onComplete, requiredClicks = 2 }: AdOverlayProps) {
  const [clickCount, setClickCount] = useState(0);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [showClickIndicator, setShowClickIndicator] = useState(false);

  useEffect(() => {
    // Seleciona um anúncio aleatório
    const randomAd = ADS[Math.floor(Math.random() * ADS.length)];
    setCurrentAd(randomAd);
  }, []);

  const handleAdClick = () => {
    // Abre o link do anúncio em nova aba
    if (currentAd) {
      window.open(currentAd.targetUrl, '_blank', 'noopener,noreferrer');
    }

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    // Mostra indicador de clique
    setShowClickIndicator(true);
    setTimeout(() => setShowClickIndicator(false), 500);

    // Verifica se atingiu o número necessário de cliques
    if (newClickCount >= requiredClicks) {
      setTimeout(() => {
        onComplete();
      }, 500);
    } else {
      // Mostra próximo anúncio
      const nextAd = ADS[Math.floor(Math.random() * ADS.length)];
      setCurrentAd(nextAd);
    }
  };

  const remainingClicks = requiredClicks - clickCount;

  if (!currentAd) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Container do anúncio */}
      <div className="relative flex flex-col items-center gap-4 p-4 max-w-full">
        {/* Contador de cliques */}
        <div className="flex items-center gap-2 text-white/80 text-sm font-medium bg-white/10 px-4 py-2 rounded-full">
          <MousePointer className="w-4 h-4" />
          <span>
            Clique no anúncio {remainingClicks > 0 ? `(${remainingClicks} ${remainingClicks === 1 ? 'clique restante' : 'cliques restantes'})` : ''}
          </span>
        </div>

        {/* Anúncio clicável */}
        <div 
          className={cn(
            "relative cursor-pointer transition-all duration-300 hover:scale-[1.02] group",
            showClickIndicator && "scale-95"
          )}
          onClick={handleAdClick}
        >
          {/* Borda animada */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-lg opacity-75 group-hover:opacity-100 blur transition duration-300 animate-pulse" />
          
          {/* Container da imagem */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <img
              src={currentAd.imageUrl}
              alt={currentAd.title || 'Anúncio'}
              className="max-w-full max-h-[50vh] object-contain"
            />
            
            {/* Overlay de hover */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl">
                <ExternalLink className="w-5 h-5" />
                Clique aqui
              </div>
            </div>
          </div>
        </div>

        {/* Indicador de progresso */}
        <div className="flex gap-2">
          {Array.from({ length: requiredClicks }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                index < clickCount 
                  ? "bg-primary scale-110" 
                  : "bg-white/30"
              )}
            />
          ))}
        </div>

        {/* Mensagem */}
        <p className="text-white/60 text-xs text-center max-w-md">
          Para assistir ao vídeo, clique nos anúncios. Isso ajuda a manter o site funcionando.
        </p>
      </div>

      {/* Indicador de clique bem-sucedido */}
      {showClickIndicator && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold animate-bounce">
            ✓ Clique registrado!
          </div>
        </div>
      )}
    </div>
  );
}
