import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Film, Tv, Plus, List, LogOut, Menu, X, Shield, UserCircle, Radio, Settings, ChevronDown, Home, Bell, Sparkles, ChevronRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}
interface MenuGroup {
  title: string;
  icon: React.ElementType;
  items: MenuItem[];
}
const AdminLayout = () => {
  const {
    user,
    isAdmin,
    isLoading,
    signOut,
    profile
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Conteúdo']);
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, isLoading, navigate]);
  useEffect(() => {
    // Close sidebar on mobile when route changes
    setSidebarOpen(false);
  }, [location.pathname]);
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      </div>;
  }
  if (!user || !isAdmin) {
    return null;
  }
  const isFounder = profile?.user_code === 'User001' || profile?.user_code === 'Fundador';
  const menuGroups: MenuGroup[] = [{
    title: 'Conteúdo',
    icon: Film,
    items: [{
      icon: Film,
      label: 'Filmes',
      href: '/admin/movies'
    }, {
      icon: Plus,
      label: 'Adicionar Filme',
      href: '/admin/movies/add'
    }, {
      icon: Tv,
      label: 'Séries',
      href: '/admin/series'
    }, {
      icon: Plus,
      label: 'Adicionar Série',
      href: '/admin/series/add'
    }, {
      icon: Radio,
      label: 'Canais ao Vivo',
      href: '/admin/live-channels'
    }]
  }];
  const mainItems: MenuItem[] = [{
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/admin'
  }];
  const settingsItems: MenuItem[] = [{
    icon: UserCircle,
    label: 'Avatars',
    href: '/admin/avatars'
  }, {
    icon: Settings,
    label: 'Configurações',
    href: '/admin/site-settings'
  }];
  const founderItems: MenuItem[] = isFounder ? [{
    icon: Shield,
    label: 'Administradores',
    href: '/admin/manage-admins'
  }, {
    icon: Shield,
    label: 'Banimentos',
    href: '/admin/bans'
  }, {
    icon: Bell,
    label: 'Notificações',
    href: '/admin/notifications'
  }, {
    icon: Crown,
    label: 'Usuários VIP',
    href: '/admin/vip'
  }] : [];
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  const toggleGroup = (title: string) => {
    setOpenGroups(prev => prev.includes(title) ? prev.filter(g => g !== title) : [...prev, title]);
  };
  const isActive = (href: string) => location.pathname === href;
  const isGroupActive = (group: MenuGroup) => group.items.some(item => location.pathname === item.href);
  const NavItem = ({
    item,
    collapsed = false
  }: {
    item: MenuItem;
    collapsed?: boolean;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    if (collapsed) {
      return <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link to={item.href} className={cn('flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200', active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <Icon className="w-5 h-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>;
    }
    return <Link to={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.badge && <span className="ml-auto px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
            {item.badge}
          </span>}
      </Link>;
  };
  const sidebarWidth = sidebarCollapsed ? 'w-[72px]' : 'w-64';
  return <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="font-bold text-white">P</span>
            </div>
            <div>
              <span className="font-bold text-sm">
                <span className="text-primary">Play</span>
                <span className="text-foreground">Box</span>
              </span>
              <span className="text-[10px] text-muted-foreground ml-2">Admin</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {/* Sidebar */}
        <aside className={cn('fixed top-0 left-0 bottom-0 bg-card border-r border-border z-40 transition-all duration-300 flex flex-col', sidebarWidth, 'lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
          {/* Logo */}
          <div className={cn('h-16 flex items-center border-b border-border shrink-0 transition-all duration-300', sidebarCollapsed ? 'px-4 justify-center' : 'px-5 gap-3')}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <span className="font-bold text-lg text-white">Rc</span>
            </div>
            {!sidebarCollapsed && <div className="min-w-0">
                <h1 className="font-bold text-base leading-none">
                  <span className="text-primary">Rynex</span>
                  <span className="text-foreground">Cine</span>
                </h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                  Admin Panel
                </p>
              </div>}
          </div>

          {/* User Info */}
          {profile && !sidebarCollapsed && <div className="px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="text-primary font-bold text-sm">
                      {profile.username?.charAt(0) || profile.user_code?.charAt(0) || 'A'}
                    </span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {profile.username || profile.user_code}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
              </div>
            </div>}

          {/* Navigation */}
          <nav className={cn('flex-1 overflow-y-auto py-4 space-y-1', sidebarCollapsed ? 'px-3' : 'px-3')}>
            {/* Main Items */}
            {mainItems.map(item => <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />)}

            {/* Divider */}
            <div className="h-px bg-border my-4" />

            {/* Menu Groups */}
            {menuGroups.map(group => {
            const GroupIcon = group.icon;
            const isOpen = openGroups.includes(group.title);
            const groupActive = isGroupActive(group);
            if (sidebarCollapsed) {
              return <div key={group.title} className="space-y-1">
                    {group.items.map(item => <NavItem key={item.href} item={item} collapsed />)}
                  </div>;
            }
            return <Collapsible key={group.title} open={isOpen} onOpenChange={() => toggleGroup(group.title)}>
                  <CollapsibleTrigger className={cn('flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', groupActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                    <div className="flex items-center gap-3">
                      <GroupIcon className="w-4 h-4" />
                      {group.title}
                    </div>
                    <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-1">
                    {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return <Link key={item.href} to={item.href} className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200', active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Link>;
                })}
                  </CollapsibleContent>
                </Collapsible>;
          })}

            {/* Divider */}
            <div className="h-px bg-border my-4" />

            {/* Settings Items */}
            <div className="space-y-1">
              {!sidebarCollapsed && <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configurações
                </p>}
              {settingsItems.map(item => <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />)}
            </div>

            {/* Founder Items */}
            {founderItems.length > 0 && <>
                <div className="h-px bg-border my-4" />
                <div className="space-y-1">
                  {!sidebarCollapsed && <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Administração
                    </p>}
                  {founderItems.map(item => <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />)}
                </div>
              </>}
          </nav>

          {/* Footer */}
          <div className={cn('border-t border-border space-y-1 shrink-0', sidebarCollapsed ? 'p-3' : 'p-3')}>
            {sidebarCollapsed ? <>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
                      <Home className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Voltar ao site</TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sair</TooltipContent>
                </Tooltip>
              </> : <>
                <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
                  <Home className="w-4 h-4" />
                  Voltar ao site
                </Link>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              </>}

            {/* Collapse Toggle */}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={cn('hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 mt-2', sidebarCollapsed && 'px-0')}>
              <ChevronRight className={cn('w-4 h-4 transition-transform duration-200', !sidebarCollapsed && 'rotate-180')} />
              {!sidebarCollapsed && <span className="ml-2 text-sm">Recolher menu</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main Content */}
        <main className={cn('min-h-screen pt-14 lg:pt-0 transition-all duration-300', sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>;
};
export default AdminLayout;