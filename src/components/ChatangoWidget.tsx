import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MessageCircle, X, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatangoVariant = "floating" | "inline";

const CHATANGO_SCRIPT_ID = "cid0020000431041310432";
const CHATANGO_SCRIPT_SRC = "//st.chatango.com/js/gz/emb.js";

const CHATANGO_EMBED_CONFIG = {
  handle: "rynexcine",
  arch: "js",
  styles: {
    a: "CC0000",
    b: 100,
    c: "FFFFFF",
    d: "FFFFFF",
    k: "CC0000",
    l: "CC0000",
    m: "CC0000",
    n: "FFFFFF",
    p: "10",
    q: "CC0000",
    r: 100,
    fwtickm: 1,
  },
} as const;

function ChatangoEmbed({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isLoaded) return;

    // React 18 StrictMode may mount/unmount twice in dev. Avoid duplicating the embed.
    const existing = container.querySelector(`#${CHATANGO_SCRIPT_ID}`);
    if (existing) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = CHATANGO_SCRIPT_ID;
    script.src = CHATANGO_SCRIPT_SRC;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.style.cssText = "width: 100%; height: 100%;";
    script.innerHTML = JSON.stringify(CHATANGO_EMBED_CONFIG);

    container.appendChild(script);
    setIsLoaded(true);

    return () => {
      // Ensure the embed is fully torn down when navigating between pages
      // (avoids "ghost" overlays that can block typing).
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [isLoaded]);

  return <div ref={containerRef} className={className} style={style} />;
}

export function ChatangoWidget({
  variant = "floating",
  className,
}: {
  variant?: ChatangoVariant;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (variant === "inline") {
    return (
      <section
        aria-label="Chat ao vivo"
        className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}
      >
        <header className="px-4 py-3 border-b border-border">
          <h2 className="font-display text-base font-semibold">Chat ao Vivo</h2>
          <p className="text-sm text-muted-foreground">
            Converse com outras pessoas enquanto assiste.
          </p>
        </header>

        <ChatangoEmbed
          className="w-full h-[520px] bg-background"
          style={{ minHeight: 350 }}
        />
      </section>
    );
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
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
              ? "bottom-4 right-4 w-72 h-12"
              : "bottom-4 right-4 w-[300px] h-[450px] sm:w-[350px] sm:h-[500px]",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="font-semibold text-sm">Chat ao Vivo</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-primary-foreground/15 rounded transition-colors"
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
                className="p-1.5 hover:bg-primary-foreground/15 rounded transition-colors"
                aria-label="Fechar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Container */}
          {!isMinimized && (
            <ChatangoEmbed
              className="w-full h-[calc(100%-40px)] bg-background"
              style={{ minHeight: 300 }}
            />
          )}
        </div>
      )}
    </>
  );
}

