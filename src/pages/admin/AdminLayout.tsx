import { useEffect, useState } from 'react';
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
  UserCircle,
  Radio,
  Settings,
  ChevronDown,
  Home,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MenuGroup {
  title: string;
  items: {
    icon: React.ElementType;
    label: string;
    href: string;
  }[];
}

const AdminLayout = () => {
  const { user, isAdmin, isLoading, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Filmes', 'Séries']);

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

  const menuGroups: MenuGroup[] = [
    {
      title: 'Filmes',
      items: [
        { icon: Plus, label: 'Adicionar', href: '/admin/movies/add' },
        { icon: List, label: 'Listar', href: '/admin/movies' },
      ],
    },
    {
      title: 'Séries',
      items: [
        { icon: Plus, label: 'Adicionar', href: '/admin/series/add' },
        { icon: List, label: 'Listar', href: '/admin/series' },
      ],
    },
  ];

  const isFounder = profile?.user_code === 'User001' || profile?.user_code === 'Fundador';

  const singleItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Radio, label: 'Canais ao Vivo', href: '/admin/live-channels' },
    { icon: UserCircle, label: 'Avatars', href: '/admin/avatars' },
    { icon: Settings, label: 'Configurações', href: '/admin/site-settings' },
    ...(isFounder
      ? [
          { icon: Shield, label: 'Administradores', href: '/admin/manage-admins' },
          { icon: Shield, label: 'Banimentos', href: '/admin/bans' },
          { icon: Bell, label: 'Notificações', href: '/admin/notifications' },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title]
    );
  };

  const isGroupActive = (group: MenuGroup) =>
    group.items.some((item) => location.pathname === item.href);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#12121a] border-b border-white/5 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
            <span className="font-bold text-sm text-white">P</span>
          </div>
          <span className="font-bold text-sm">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 w-60 bg-[#12121a] border-r border-white/5 z-40 transition-transform duration-300 flex flex-col',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-5 border-b border-white/5 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="font-bold text-lg text-white">P</span>
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none">
              <span className="text-primary">Play</span>
              <span className="text-white">Box</span>
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Admin</p>
          </div>
        </div>

        {/* User Info */}
        {profile && (
          <div className="px-5 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <span className="text-primary font-bold text-sm">
                  {profile.user_code?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile.user_code}</p>
                <p className="text-xs text-white/40 truncate">{profile.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Dashboard Link */}
          <Link
            to="/admin"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              location.pathname === '/admin'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          {/* Grouped Menu Items */}
          {menuGroups.map((group) => (
            <Collapsible
              key={group.title}
              open={openGroups.includes(group.title)}
              onOpenChange={() => toggleGroup(group.title)}
            >
              <CollapsibleTrigger
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isGroupActive(group)
                    ? 'text-primary bg-primary/10'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  {group.title === 'Filmes' ? (
                    <Film className="w-4 h-4" />
                  ) : (
                    <Tv className="w-4 h-4" />
                  )}
                  {group.title}
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    openGroups.includes(group.title) && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Divider */}
          <div className="h-px bg-white/5 my-3" />

          {/* Single Items */}
          {singleItems.slice(1).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 space-y-2 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all"
          >
            <Home className="w-4 h-4" />
            Voltar ao site
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-white/60 hover:text-red-400 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:pl-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
