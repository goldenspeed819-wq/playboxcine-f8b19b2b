import { Link } from 'react-router-dom';
import { ContactDialog } from './ContactDialog';

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/30 mt-20">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-lg text-primary-foreground">P</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg leading-tight">
                  <span className="text-primary">Play</span>
                  <span className="text-foreground">Box</span>
                </h2>
                <p className="text-[10px] text-primary font-medium tracking-widest uppercase">CINE</p>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Sua plataforma de streaming favorita. Assista aos melhores filmes e séries em alta qualidade.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-6">
              Navegação
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/browse" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/movies" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Filmes
                </Link>
              </li>
              <li>
                <Link to="/series" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Séries
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-6">
              Informações
            </h3>
            <ul className="space-y-3">
              <li>
                <span className="text-muted-foreground text-sm cursor-not-allowed">Termos de Uso</span>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Política de Privacidade
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
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <p className="text-muted-foreground text-xs">
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
