import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatangoWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !isLoaded && containerRef.current) {
      // Create and inject the Chatango script
      const script = document.createElement('script');
      script.id = 'cid0020000429306372543';
      script.src = '//st.chatango.com/js/gz/emb.js';
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.innerHTML = JSON.stringify({
        handle: 'rynexcine',
        arch: 'js',
        styles: {
          a: 'CC0000',
          b: 100,
          c: 'FFFFFF',
          d: 'FFFFFF',
          k: 'CC0000',
          l: 'CC0000',
          m: 'CC0000',
          n: 'FFFFFF',
          p: '10',
          q: 'CC0000',
          r: 100,
          fwtickm: 1
        }
      });

      containerRef.current.appendChild(script);
      setIsLoaded(true);
    }
  }, [isOpen, isLoaded]);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-[#CC0000] hover:bg-[#AA0000] text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[100] bg-background border border-border rounded-xl shadow-2xl overflow-hidden transition-all duration-300",
            isMinimized 
              ? "bottom-4 right-4 w-64 h-12" 
              : "bottom-4 right-4 w-80 h-96 sm:w-[320px] sm:h-[450px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#CC0000] text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="font-semibold text-sm">Chat ao Vivo</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                aria-label={isMinimized ? "Maximizar" : "Minimizar"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                aria-label="Fechar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Container */}
          {!isMinimized && (
            <div 
              ref={containerRef} 
              className="w-full h-[calc(100%-40px)] bg-white"
              style={{ minHeight: '300px' }}
            />
          )}
        </div>
      )}
    </>
  );
}
