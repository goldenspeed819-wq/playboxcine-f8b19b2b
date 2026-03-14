import { Link } from 'react-router-dom';
import { ContactDialog } from './ContactDialog';
import logo from '@/assets/logo.png';

export function Footer() {
  return (
    <footer className="bg-card/50 border-t border-border/30 mt-12 sm:mt-20">
      <div className="container mx-auto px-4 py-10 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {/* Logo */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-5">
              <img src={logo} alt="Rynex Cine" className="w-10 h-10 rounded-xl object-contain ring-1 ring-primary/20" />
              <div>
                <h2 className="font-display text-2xl tracking-wide leading-tight">
                  <span className="gradient-text">RYNEX</span>
                  <span className="text-foreground">CINE</span>
                </h2>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Sua plataforma de streaming premium. Filmes e séries em alta qualidade.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground mb-5">
              Navegação
            </h3>
            <ul className="space-y-3">
              {[
                { to: '/browse', label: 'Início' },
                { to: '/movies', label: 'Filmes' },
                { to: '/series', label: 'Séries' },
                { to: '/live', label: 'Ao Vivo' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Conta */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground mb-5">
              Conta
            </h3>
            <ul className="space-y-3">
              {[
                { to: '/favorites', label: 'Favoritos' },
                { to: '/history', label: 'Histórico' },
                { to: '/settings', label: 'Configurações' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground mb-5">
              Legal
            </h3>
            <ul className="space-y-3">
              <li><Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">Termos de Uso</Link></li>
              <li><Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">Privacidade</Link></li>
              <li><ContactDialog /></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/20">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Rynex Cine. Todos os direitos reservados.
          </p>
          <Link to="/admin-login" className="text-muted-foreground/10 hover:text-muted-foreground/30 text-[10px] transition-colors">.</Link>
        </div>
      </div>
    </footer>
  );
}