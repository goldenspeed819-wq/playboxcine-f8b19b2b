import { Link } from 'react-router-dom';
import { ContactDialog } from './ContactDialog';

export function Footer() {
  return (
    <footer className="bg-surface-darker border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-lg text-primary-foreground">P</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">
                  <span className="text-primary">Play</span>
                  <span className="text-foreground">Box</span>
                </h2>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase -mt-1">Cine</p>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Sua plataforma de streaming favorita. Assista aos melhores filmes e séries em alta qualidade.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider mb-4">Navegação</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/movies" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Filmes
                </Link>
              </li>
              <li>
                <Link to="/series" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Séries
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider mb-4">Informações</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-muted-foreground text-sm">Termos de Uso</span>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <ContactDialog />
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} PlayBox Cine. Todos os direitos reservados.
          </p>
          {/* Hidden Admin Link */}
          <Link
            to="/admin-login"
            className="text-muted-foreground/30 hover:text-muted-foreground/50 text-[10px] transition-colors"
          >
            .
          </Link>
        </div>
      </div>
    </footer>
  );
}
