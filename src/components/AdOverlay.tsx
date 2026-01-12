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
const ADSTERRA_DIRECT_LINK = 'https://www.effectivegatecpm.com/mm45k1z9?key=cf797bf3e207228f2b203537dd93910b';

// Popunder Script ID para ganhos extras
const ADSTERRA_POPUNDER_ID = '28361788';

// ============================================

export function AdOverlay({ onComplete, requiredClicks = 2 }: AdOverlayProps) {
  const [clickCount, setClickCount] = useState(0);
  const [showClickIndicator, setShowClickIndicator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adblockDetected, setAdblockDetected] = useState(false);

  // Detecta AdBlock
  useEffect(() => {
    const detectAdBlock = async () => {
      try {
        // Tenta carregar um script de teste que AdBlockers normalmente bloqueiam
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = 'adsbox ad-banner ad-placeholder';
        testAd.style.position = 'absolute';
        testAd.style.left = '-9999px';
        document.body.appendChild(testAd);

        // Aguarda um momento para o AdBlock agir
        await new Promise(resolve => setTimeout(resolve, 100));

        // Se o elemento foi removido ou está oculto, AdBlock está ativo
        const isBlocked = testAd.offsetHeight === 0 || 
                         testAd.clientHeight === 0 || 
                         !document.body.contains(testAd);
        
        if (document.body.contains(testAd)) {
          document.body.removeChild(testAd);
        }

        // Também tenta fazer uma requisição para um domínio típico de ads
        try {
          await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
            method: 'HEAD',
            mode: 'no-cors'
          });
        } catch {
          setAdblockDetected(true);
          return;
        }

        setAdblockDetected(isBlocked);
      } catch {
        setAdblockDetected(true);
      }
    };

    detectAdBlock();
  }, []);

  // Inicializa o Popunder do Adsterra
  useEffect(() => {
    if (ADSTERRA_POPUNDER_ID && !adblockDetected) {
      try {
        const script = document.createElement('script');
        script.src = `//www.highperformanceformat.com/${ADSTERRA_POPUNDER_ID}/invoke.js`;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        document.body.appendChild(script);

        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } catch (error) {
        console.log('Popunder não carregado');
      }
    }
  }, [adblockDetected]);

  const handleAdClick = useCallback(() => {
    setIsLoading(true);
    
    // Abre o Direct Link do Adsterra
    window.open(ADSTERRA_DIRECT_LINK, '_blank', 'noopener,noreferrer');

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

  // Se AdBlock detectado, mostra aviso
  if (adblockDetected) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black via-black/98 to-black">
        <div className="relative flex flex-col items-center gap-6 p-6 max-w-lg w-full mx-4 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
            <svg className="w-10 h-10 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-white">
            AdBlock Detectado
          </h3>
          
          <p className="text-white/70 text-base leading-relaxed">
            Detectamos que você está usando um bloqueador de anúncios. 
            Por favor, desative-o para continuar assistindo.
          </p>
          
          <div className="bg-white/10 rounded-xl p-4 w-full border border-white/10">
            <p className="text-white/80 text-sm mb-3">
              <strong>Como desativar:</strong>
            </p>
            <ol className="text-white/60 text-sm text-left space-y-2">
              <li>1. Clique no ícone do AdBlock no seu navegador</li>
              <li>2. Selecione "Pausar neste site" ou "Desativar"</li>
              <li>3. Atualize a página (F5)</li>
            </ol>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors"
          >
            Já desativei, atualizar página
          </button>

          <p className="text-white/40 text-xs mt-2">
            Os anúncios nos ajudam a manter o site gratuito. Obrigado pelo apoio! 💜
          </p>
        </div>
      </div>
    );
  }

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
