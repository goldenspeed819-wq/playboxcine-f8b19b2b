import { Link } from 'react-router-dom';
import { ContactDialog } from './ContactDialog';

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/30 mt-12 sm:mt-20">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12 md:gap-8">
          {/* Logo & Description */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-sm sm:text-lg text-primary-foreground">P</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-base sm:text-lg leading-tight">
                  <span className="text-primary">Play</span>
                  <span className="text-foreground">Box</span>
                </h2>
                <p className="text-[9px] sm:text-[10px] text-primary font-medium tracking-widest uppercase">CINE</p>
              </div>
            </Link>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-sm">
              Sua plataforma de streaming favorita. Assista aos melhores filmes e séries em alta qualidade.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-display font-bold text-xs sm:text-sm uppercase tracking-wider text-foreground mb-4 sm:mb-6">
              Navegação
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link to="/browse" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/movies" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Filmes
                </Link>
              </li>
              <li>
                <Link to="/series" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Séries
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-display font-bold text-xs sm:text-sm uppercase tracking-wider text-foreground mb-4 sm:mb-6">
              Informações
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Privacidade
                </Link>
              </li>
              <li>
                <ContactDialog />
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border/20">
        <div className="container mx-auto px-4 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-muted-foreground text-[10px] sm:text-xs text-center sm:text-left">
            © {new Date().getFullYear()} PlayBox Cine. Todos os direitos reservados.
          </p>
          <Link
            to="/admin-login"
            className="text-muted-foreground/20 hover:text-muted-foreground/40 text-[10px] transition-colors"
          >
            .
          </Link>
        </div>
      </div>
    </footer>
  );
}
