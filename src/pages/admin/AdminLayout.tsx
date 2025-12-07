import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Tv,
  Plus,
  List,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const AdminLayout = () => {
  const { user, isAdmin, isLoading, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Plus, label: 'Adicionar Filme', href: '/admin/movies/add' },
    { icon: List, label: 'Listar Filmes', href: '/admin/movies' },
    { icon: Plus, label: 'Adicionar Série', href: '/admin/series/add' },
    { icon: List, label: 'Listar Séries', href: '/admin/series' },
    { icon: Shield, label: 'Gerenciar Admins', href: '/admin/manage-admins' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="font-display font-bold text-sm text-primary-foreground">P</span>
          </div>
          <span className="font-display font-bold text-sm">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-40 transition-transform duration-300',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="font-display font-bold text-lg text-primary-foreground">P</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-sm">
              <span className="text-primary">Play</span>Box
            </h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>

        {/* User Info */}
        {profile && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-primary">{profile.user_code}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
          <Link
            to="/"
            className="block text-center text-xs text-muted-foreground mt-2 hover:text-primary transition-colors"
          >
            ← Voltar ao site
          </Link>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
