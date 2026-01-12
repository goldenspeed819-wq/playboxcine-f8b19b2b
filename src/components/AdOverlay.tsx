import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, MousePointer, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdOverlayProps {
  onComplete: () => void;
  requiredClicks?: number;
}

// ============================================
// CONFIGURAÇÃO DO ADSTERRA
// ============================================
// 
// PASSO 1: Crie uma conta no Adsterra (https://adsterra.com)
// 
// PASSO 2: Crie um "Direct Link" no painel do Adsterra:
//   - Vá em "Websites" > "Add website" e adicione seu domínio
//   - Depois vá em "Direct Link" > "Get Direct Link"
//   - Copie o link gerado (formato: https://www.profitabledisplaynetwork.com/xxxxx)
//
// PASSO 3: Substitua a URL abaixo pelo seu Direct Link do Adsterra:
const ADSTERRA_DIRECT_LINK = 'https://www.profitabledisplaynetwork.com/4/YOUR_ADSTERRA_ID';

// OPCIONAL - Popunder Script ID (para ganhos extras)
// Vá em "Popunder" > "Get code" e pegue apenas o ID do script
const ADSTERRA_POPUNDER_ID = 'YOUR_POPUNDER_ID'; // Ex: '1234567'

// ============================================

export function AdOverlay({ onComplete, requiredClicks = 2 }: AdOverlayProps) {
  const [clickCount, setClickCount] = useState(0);
  const [showClickIndicator, setShowClickIndicator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializa o Popunder do Adsterra (carrega uma vez)
  useEffect(() => {
    if (ADSTERRA_POPUNDER_ID && ADSTERRA_POPUNDER_ID !== 'YOUR_POPUNDER_ID') {
      try {
        // Cria o script do popunder do Adsterra
        const script = document.createElement('script');
        script.src = `//www.highperformanceformat.com/${ADSTERRA_POPUNDER_ID}/invoke.js`;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        document.body.appendChild(script);

        return () => {
          document.body.removeChild(script);
        };
      } catch (error) {
        console.log('Popunder não carregado');
      }
    }
  }, []);

  const handleAdClick = useCallback(() => {
    setIsLoading(true);
    
    // Abre o Direct Link do Adsterra
    const directLink = ADSTERRA_DIRECT_LINK !== 'https://www.profitabledisplaynetwork.com/4/YOUR_ADSTERRA_ID' 
      ? ADSTERRA_DIRECT_LINK 
      : 'https://www.profitabledisplaynetwork.com/4/8444172'; // Link de exemplo/teste
    
    window.open(directLink, '_blank', 'noopener,noreferrer');

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    // Mostra indicador de clique
    setShowClickIndicator(true);
    setTimeout(() => {
      setShowClickIndicator(false);
      setIsLoading(false);
    }, 800);

    // Verifica se atingiu o número necessário de cliques
    if (newClickCount >= requiredClicks) {
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  }, [clickCount, requiredClicks, onComplete]);

  const remainingClicks = requiredClicks - clickCount;
  const isCompleted = clickCount >= requiredClicks;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black via-black/98 to-black">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Container principal */}
      <div className="relative flex flex-col items-center gap-6 p-6 max-w-lg w-full mx-4">
        {/* Ícone e título */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Desbloqueie o Vídeo
          </h3>
          <p className="text-white/60 text-sm">
            Clique no botão abaixo para liberar o conteúdo
          </p>
        </div>

        {/* Contador de cliques */}
        <div className="flex items-center gap-2 text-white/80 text-sm font-medium bg-white/10 px-5 py-2.5 rounded-full border border-white/10">
          <MousePointer className="w-4 h-4 text-primary" />
          <span>
            {isCompleted 
              ? 'Liberando vídeo...' 
              : `${remainingClicks} ${remainingClicks === 1 ? 'clique restante' : 'cliques restantes'}`
            }
          </span>
        </div>

        {/* Botão de anúncio */}
        <button
          onClick={handleAdClick}
          disabled={isLoading || isCompleted}
          className={cn(
            "relative group w-full max-w-sm transition-all duration-300",
            (isLoading || isCompleted) && "opacity-70 pointer-events-none"
          )}
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-xl opacity-75 group-hover:opacity-100 blur-md transition duration-300 animate-pulse" />
          
          {/* Botão principal */}
          <div className={cn(
            "relative flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-primary to-primary/80 rounded-xl font-bold text-primary-foreground text-lg shadow-2xl transition-all duration-300",
            !isLoading && !isCompleted && "group-hover:scale-[1.02] group-active:scale-[0.98]",
            showClickIndicator && "scale-95 bg-green-500"
          )}>
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : isCompleted ? (
              <>
                <Play className="w-5 h-5" />
                Liberando...
              </>
            ) : showClickIndicator ? (
              <>
                ✓ Clique registrado!
              </>
            ) : (
              <>
                <ExternalLink className="w-5 h-5" />
                Clique Aqui para Continuar
              </>
            )}
          </div>
        </button>

        {/* Indicador de progresso */}
        <div className="flex gap-3">
          {Array.from({ length: requiredClicks }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-500",
                index < clickCount 
                  ? "bg-primary scale-125 shadow-lg shadow-primary/50" 
                  : "bg-white/20"
              )}
            />
          ))}
        </div>

        {/* Mensagem de suporte */}
        <p className="text-white/40 text-xs text-center max-w-sm">
          Os anúncios nos ajudam a manter o site gratuito. Obrigado pelo apoio!
        </p>

        {/* Badge de segurança */}
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Links seguros e verificados</span>
        </div>
      </div>

      {/* Efeito de sucesso */}
      {showClickIndicator && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-green-500/10 animate-pulse" />
        </div>
      )}
    </div>
  );
}
