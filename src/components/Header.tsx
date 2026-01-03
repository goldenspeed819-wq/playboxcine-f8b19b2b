import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, MoreVertical, LogOut, Settings, Home, Film, Popcorn, Tv, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
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
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/browse" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/30 transition-colors" />
              <img 
                src={logo} 
                alt="PlayBox Cine" 
                className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover ring-2 ring-primary/50 group-hover:ring-primary transition-all relative z-10"
              />
            </div>
            <span className="hidden sm:block font-display text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              PlayBox<span className="text-primary">Cine</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
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
          <div className="flex items-center gap-1 md:gap-2">
            {/* Search */}
            <div className="flex items-center">
              <form onSubmit={handleSearch} className={cn(
                'transition-all duration-300 overflow-hidden',
                searchOpen ? 'w-40 md:w-56' : 'w-0'
              )}>
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-secondary/80 border-border/50 focus:border-primary h-8 text-sm rounded-full px-4"
                  autoFocus={searchOpen}
                />
              </form>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSearchClick}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-9 w-9 rounded-full"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-border/50" />

            {/* User Profile */}
            {profile && (
              <div className="hidden sm:flex items-center gap-2 px-2 py-1.5 rounded-full bg-secondary/30 hover:bg-secondary/50 transition-colors">
                {profile.avatar_url && (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
                  />
                )}
                <span className="text-xs font-medium text-foreground max-w-[80px] truncate">
                  {profile.username || profile.user_code}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAdminClick}
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
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
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
                    title="Histórico"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/settings')}
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-8 w-8 rounded-full"
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full"
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
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
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
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 font-body font-semibold py-2.5 px-4 rounded-lg transition-colors',
                    location.pathname === link.href
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
