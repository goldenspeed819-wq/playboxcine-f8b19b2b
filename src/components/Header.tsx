import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, MoreVertical, LogOut, Settings, Home, Film, Popcorn, Tv, History, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { EpisodeNotifications } from '@/components/EpisodeNotifications';
import { ThemeToggle } from '@/components/ThemeToggle';
import logo from '@/assets/logo.png';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, profile, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSearchClick = () => {
    if (searchOpen && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    } else {
      setSearchOpen(!searchOpen);
    }
  };

  const handleAdminClick = () => {
    if (isAdmin) navigate('/admin');
    else toast({ title: 'Acesso negado', description: '', variant: 'destructive' });
  };

  const navLinks = [
    { href: '/browse', label: 'Início', icon: Home },
    { href: '/movies', label: 'Filmes', icon: Film },
    { href: '/series', label: 'Séries', icon: Popcorn },
    { href: '/live', label: 'Ao Vivo', icon: Tv },
  ];

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
      isScrolled
        ? 'bg-background/90 backdrop-blur-xl border-b border-border/50'
        : 'bg-gradient-to-b from-background/60 to-transparent'
    )}>
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-18">
          {/* Logo */}
          <Link to="/browse" className="flex items-center gap-2.5 group flex-shrink-0">
            <img 
              src={logo} 
              alt="Rynex Cine" 
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain ring-1 ring-primary/30 group-hover:ring-primary/60 transition-all"
            />
            <span className="hidden sm:block font-display text-xl sm:text-2xl tracking-wider">
              <span className="gradient-text">RYNEX</span>
              <span className="text-foreground/80">CINE</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link key={link.href} to={link.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all relative',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <div className="flex items-center">
              <form onSubmit={handleSearch} className={cn(
                'transition-all duration-300 overflow-hidden',
                searchOpen ? 'w-36 sm:w-48 md:w-56' : 'w-0'
              )}>
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-secondary/60 border-border/30 focus:border-primary h-8 text-sm rounded-lg px-3"
                  autoFocus={searchOpen}
                />
              </form>
              <Button variant="ghost" size="icon" onClick={handleSearchClick}
                className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <div className="hidden sm:block h-4 w-px bg-border/40 mx-1" />

            {/* Profile chip */}
            {profile && (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-default">
                {profile.avatar_url && (
                  <img src={profile.avatar_url} alt="Avatar" 
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-primary/20" />
                )}
                <span className="text-xs font-medium text-foreground max-w-[70px] truncate">
                  {profile.username || profile.user_code}
                </span>
              </div>
            )}

            <div className="flex items-center">
              <div className="hidden sm:flex"><EpisodeNotifications /></div>
              <div className="hidden sm:flex"><ThemeToggle /></div>
              <Button variant="ghost" size="icon" onClick={() => navigate('/favorites')}
                className="hidden sm:flex text-muted-foreground hover:text-primary h-8 w-8 rounded-lg" title="Favoritos">
                <Heart className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={handleAdminClick}
                  className="hidden sm:flex text-muted-foreground hover:text-primary h-8 w-8 rounded-lg" title="Admin">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              )}
              {profile && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => navigate('/history')}
                    className="hidden sm:flex text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg" title="Histórico">
                    <History className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}
                    className="hidden sm:flex text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg" title="Configurações">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={signOut}
                    className="hidden sm:flex text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg" title="Sair">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon"
                className="md:hidden text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
                onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          'md:hidden overflow-hidden transition-all duration-300',
          isMenuOpen ? 'max-h-[500px] pb-4' : 'max-h-0'
        )}>
          {profile && (
            <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-secondary/20 border border-border/30">
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover ring-1 ring-primary/30" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{profile.username || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">#{profile.user_code}</p>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-0.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} to={link.href} onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 py-3 px-4 rounded-xl transition-colors',
                    location.pathname === link.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/50'
                  )}>
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
            <div className="h-px bg-border/30 my-2" />
            <Link to="/favorites" onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 py-3 px-4 rounded-xl text-muted-foreground hover:bg-secondary/50">
              <Heart className="w-5 h-5" /><span className="font-medium">Favoritos</span>
            </Link>
            <Link to="/history" onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 py-3 px-4 rounded-xl text-muted-foreground hover:bg-secondary/50">
              <History className="w-5 h-5" /><span className="font-medium">Histórico</span>
            </Link>
            <Link to="/settings" onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 py-3 px-4 rounded-xl text-muted-foreground hover:bg-secondary/50">
              <Settings className="w-5 h-5" /><span className="font-medium">Configurações</span>
            </Link>
            {isAdmin && (
              <button onClick={() => { setIsMenuOpen(false); handleAdminClick(); }}
                className="flex items-center gap-3 py-3 px-4 rounded-xl text-muted-foreground hover:bg-secondary/50 w-full text-left">
                <MoreVertical className="w-5 h-5" /><span className="font-medium">Painel Admin</span>
              </button>
            )}
            <button onClick={() => { setIsMenuOpen(false); signOut(); }}
              className="flex items-center gap-3 py-3 px-4 rounded-xl text-destructive hover:bg-destructive/10 w-full text-left mt-1">
              <LogOut className="w-5 h-5" /><span className="font-medium">Sair</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}