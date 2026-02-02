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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
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
    if (isAdmin) {
      navigate('/admin');
    } else {
      toast({
        title: 'Acesso negado',
        description: '',
        variant: 'destructive',
      });
    }
  };

  const navLinks = [
    { href: '/browse', label: 'INÍCIO', icon: Home },
    { href: '/movies', label: 'FILMES', icon: Film },
    { href: '/series', label: 'SÉRIES', icon: Popcorn },
    { href: '/live', label: 'AO VIVO', icon: Tv },
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
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <Link to="/browse" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/30 transition-colors" />
              <img 
                src={logo} 
                alt="Rynex Cine" 
                className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-lg object-contain ring-2 ring-primary/50 group-hover:ring-primary transition-all relative z-10"
              />
            </div>
            <span className="hidden sm:block font-display text-base sm:text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              Rynex<span className="text-primary">Cine</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex items-center gap-2 font-body font-semibold text-sm tracking-wider transition-all relative group',
                    location.pathname === link.href
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className={cn(
                    'w-4 h-4 transition-transform group-hover:scale-110',
                    location.pathname === link.href && 'text-primary'
                  )} />
                  <span>{link.label}</span>
                  {location.pathname === link.href && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Search & Actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <div className="flex items-center">
              <form onSubmit={handleSearch} className={cn(
                'transition-all duration-300 overflow-hidden',
                searchOpen ? 'w-32 sm:w-40 md:w-56' : 'w-0'
              )}>
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-secondary/80 border-border/50 focus:border-primary h-8 text-sm rounded-full px-3 sm:px-4"
                  autoFocus={searchOpen}
                />
              </form>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSearchClick}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 sm:h-9 sm:w-9 rounded-full"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden sm:block h-5 w-px bg-border/50 mx-1" />

            {/* User Profile - Hidden on mobile */}
            {profile && (
              <div className="hidden md:flex items-center gap-2 px-2 py-1.5 rounded-full bg-secondary/30 hover:bg-secondary/50 transition-colors">
                {profile.avatar_url && (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-primary/20"
                  />
                )}
                <span className="text-xs font-medium text-foreground max-w-[70px] truncate">
                  {profile.username || profile.user_code}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center">
              {/* Notifications */}
              <div className="hidden sm:flex">
                <EpisodeNotifications />
              </div>
              
              {/* Theme Toggle */}
              <div className="hidden sm:flex">
                <ThemeToggle />
              </div>

              {/* Favorites Link */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/favorites')}
                className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
                title="Favoritos"
              >
                <Heart className="w-4 h-4" />
              </Button>

              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAdminClick}
                  className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
                  title="Painel Admin"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              )}
              {profile && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/history')}
                    className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
                    title="Histórico"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/settings')}
                    className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="hidden sm:flex text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300',
            isMenuOpen ? 'max-h-[400px] pb-4' : 'max-h-0'
          )}
        >
          {/* User Profile Mobile */}
          {profile && (
            <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-secondary/30">
              {profile.avatar_url && (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {profile.username || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{profile.user_code}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 font-body font-semibold py-3 px-4 rounded-xl transition-colors',
                    location.pathname === link.href
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-secondary active:bg-secondary'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            
            {/* Divider */}
            <div className="h-px bg-border/50 my-2" />
            
            {/* Additional Links */}
            <Link
              to="/history"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 font-body font-semibold py-3 px-4 rounded-xl text-muted-foreground hover:bg-secondary active:bg-secondary"
            >
              <History className="w-5 h-5" />
              <span>Histórico</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 font-body font-semibold py-3 px-4 rounded-xl text-muted-foreground hover:bg-secondary active:bg-secondary"
            >
              <Settings className="w-5 h-5" />
              <span>Configurações</span>
            </Link>
            {isAdmin && (
              <button
                onClick={() => { setIsMenuOpen(false); handleAdminClick(); }}
                className="flex items-center gap-3 font-body font-semibold py-3 px-4 rounded-xl text-muted-foreground hover:bg-secondary active:bg-secondary w-full text-left"
              >
                <MoreVertical className="w-5 h-5" />
                <span>Painel Admin</span>
              </button>
            )}
            
            {/* Logout */}
            <button
              onClick={() => { setIsMenuOpen(false); signOut(); }}
              className="flex items-center gap-3 font-body font-semibold py-3 px-4 rounded-xl text-destructive hover:bg-destructive/10 active:bg-destructive/10 w-full text-left mt-1"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
