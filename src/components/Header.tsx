import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, MoreVertical, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, profile, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSearchClick = () => {
    if (searchOpen && searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    } else {
      setSearchOpen(!searchOpen);
    }
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      navigate('/admin');
    } else {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar o painel administrativo.',
        variant: 'destructive',
      });
    }
  };

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/movies', label: 'Filmes' },
    { href: '/series', label: 'Séries' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur-lg border-b border-border shadow-lg'
          : 'bg-gradient-to-b from-background/80 to-transparent'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-lg flex items-center justify-center neon-glow">
                <span className="font-display font-bold text-lg md:text-xl text-primary-foreground">P</span>
              </div>
              <div className="absolute inset-0 bg-primary/50 rounded-lg blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg md:text-xl">
                <span className="text-primary">Play</span>
                <span className="text-foreground">Box</span>
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase -mt-1">Cine</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'font-body font-semibold text-sm uppercase tracking-wider transition-colors relative',
                  location.pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
                {location.pathname === link.href && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Search & Mobile Menu */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className={cn(
              'transition-all duration-300 overflow-hidden',
              searchOpen ? 'w-48 md:w-64' : 'w-0'
            )}>
              <Input
                placeholder="Buscar filmes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary h-9"
                autoFocus={searchOpen}
              />
            </form>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchClick}
              className="text-muted-foreground hover:text-foreground"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAdminClick}
              className="text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
            {profile && (
              <>
                <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                  {profile.user_code}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300',
            isMenuOpen ? 'max-h-64 pb-4' : 'max-h-0'
          )}
        >
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  'font-body font-semibold py-2 px-4 rounded-lg transition-colors',
                  location.pathname === link.href
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
