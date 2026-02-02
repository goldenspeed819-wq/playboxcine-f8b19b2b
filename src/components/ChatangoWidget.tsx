import { useState } from "react";
import { MessageCircle, X, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatangoVariant = "floating" | "inline";

// Chatango iframe embed URL
const CHATANGO_IFRAME_URL =
  "https://rynexcine.chatango.com/";

function ChatangoEmbed({
  className,
  height = 520,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <iframe
      src={CHATANGO_IFRAME_URL}
      className={cn("w-full border-0", className)}
      style={{ height }}
      allow="autoplay"
      title="Chat ao Vivo"
    />
  );
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

        <ChatangoEmbed className="bg-background" height={520} />
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
              : "bottom-4 right-4 w-[350px] h-[500px]",
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
          {!isMinimized && <ChatangoEmbed className="bg-background" height={460} />}
        </div>
      )}
    </>
  );
}
