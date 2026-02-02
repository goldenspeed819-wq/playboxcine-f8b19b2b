import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PageLoader } from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { ParentalControlDialog } from '@/components/ParentalControlDialog';
import { LanguagePreferences } from '@/components/LanguagePreferences';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  User,
  Mail,
  Key,
  Shield,
  Trash2,
  Save,
  ChevronLeft,
  Palette,
  Bell,
  Globe,
  Link2,
  HelpCircle,
  FileText,
  LogOut,
  Clock,
  Hash,
  Calendar,
  Languages,
  Moon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Avatar {
  id: string;
  image_url: string;
  character_name: string | null;
}

const Settings = () => {
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showParentalDialog, setShowParentalDialog] = useState(false);

  // Preferences state
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setSelectedAvatar(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    fetchAvatars();
    loadPreferences();
  }, []);

  const fetchAvatars = async () => {
    try {
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAvatars(data || []);
    } catch (error) {
      console.error('Error fetching avatars:', error);
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  const loadPreferences = () => {
    const saved = localStorage.getItem('user_preferences');
    if (saved) {
      const prefs = JSON.parse(saved);
      setAutoPlay(prefs.autoPlay ?? true);
      setNotifications(prefs.notifications ?? true);
    }
  };

  const savePreferences = (key: string, value: boolean) => {
    const saved = localStorage.getItem('user_preferences');
    const prefs = saved ? JSON.parse(saved) : {};
    prefs[key] = value;
    localStorage.setItem('user_preferences', JSON.stringify(prefs));
  };

  const handleSaveProfile = async () => {
    if (!user || !username.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome de usuário é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          avatar_url: selectedAvatar,
          profile_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas alterações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu perfil.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'Entre em contato com o suporte para excluir sua conta.',
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const memberSince = 'Membro ativo';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-24 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/30 bg-card">
              {selectedAvatar ? (
                <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/20">
                  <User className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {username || 'Minha Conta'}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Hash className="w-4 h-4" />
              {profile?.user_code}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-card/50 border border-border/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4" />
              Conta
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="w-4 h-4" />
              Preferências
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HelpCircle className="w-4 h-4" />
              Ajuda
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Informações do Perfil</CardTitle>
                    <CardDescription>Personalize como você aparece na plataforma</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu nome de usuário"
                    className="bg-secondary/50 border-border/50"
                  />
                </div>

                {/* Avatar Selection */}
                <div className="space-y-3">
                  <Label>Escolha seu Avatar</Label>
                  {isLoadingAvatars ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                      {avatars.map((avatar) => (
                        <button
                          key={avatar.id}
                          onClick={() => setSelectedAvatar(avatar.image_url)}
                          className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                            selectedAvatar === avatar.image_url
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                              : 'hover:ring-2 hover:ring-border hover:scale-105 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={avatar.image_url}
                            alt={avatar.character_name || 'Avatar'}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Account Info */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Mail className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Informações da Conta</CardTitle>
                    <CardDescription>Detalhes da sua conta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Mail className="w-4 h-4" />
                      Email
                    </div>
                    <p className="font-medium text-foreground truncate">{profile?.email || user.email}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Hash className="w-4 h-4" />
                      Código do Usuário
                    </div>
                    <p className="font-medium font-mono text-foreground">{profile?.user_code}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4" />
                      Membro desde
                    </div>
                    <p className="font-medium text-foreground">{memberSince}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Shield className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle>Segurança</CardTitle>
                    <CardDescription>Gerencie a segurança da sua conta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Alterar senha</p>
                      <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                    Alterar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Sair da conta</p>
                      <p className="text-sm text-muted-foreground">Encerrar sessão atual</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Sair
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-destructive">Zona de perigo</CardTitle>
                    <CardDescription>Ações irreversíveis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <div>
                    <p className="font-medium text-foreground">Excluir conta</p>
                    <p className="text-sm text-muted-foreground">
                      Exclua permanentemente sua conta e todos os dados
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
                          e removerá todos os seus dados de nossos servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sim, excluir conta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Palette className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle>Preferências de Reprodução</CardTitle>
                    <CardDescription>Personalize sua experiência de streaming</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Reprodução automática</p>
                      <p className="text-sm text-muted-foreground">Iniciar próximo episódio automaticamente</p>
                    </div>
                  </div>
                  <Switch
                    checked={autoPlay}
                    onCheckedChange={(checked) => {
                      setAutoPlay(checked);
                      savePreferences('autoPlay', checked);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Bell className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>Notificações</CardTitle>
                    <CardDescription>Gerencie suas notificações</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Novos conteúdos</p>
                      <p className="text-sm text-muted-foreground">Receber notificação de novos filmes e séries</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={(checked) => {
                      setNotifications(checked);
                      savePreferences('notifications', checked);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Language Preferences */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Languages className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Idioma</CardTitle>
                    <CardDescription>Preferências de áudio e legenda</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <LanguagePreferences variant="inline" />
              </CardContent>
            </Card>

            {/* Theme */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10">
                    <Moon className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <CardTitle>Aparência</CardTitle>
                    <CardDescription>Personalize o visual do site</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Tema</p>
                      <p className="text-sm text-muted-foreground">Escolha entre claro, escuro ou automático</p>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            {/* Parental Control */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Shield className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle>Controle Parental</CardTitle>
                    <CardDescription>Restrinja conteúdo por classificação etária</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Configurar controle parental</p>
                      <p className="text-sm text-muted-foreground">Defina um PIN e limite de classificação</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowParentalDialog(true)}>
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <HelpCircle className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <CardTitle>Central de Ajuda</CardTitle>
                    <CardDescription>Encontre respostas e suporte</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <a
                  href="https://discord.gg/hMKWsxAUgJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">Suporte via Discord</p>
                      <p className="text-sm text-muted-foreground">Entre no nosso servidor para obter ajuda</p>
                    </div>
                  </div>
                  <Link2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>

                <Link
                  to="/terms"
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">Termos de Uso</p>
                      <p className="text-sm text-muted-foreground">Leia nossos termos de serviço</p>
                    </div>
                  </div>
                  <Link2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  to="/privacy"
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">Política de Privacidade</p>
                      <p className="text-sm text-muted-foreground">Saiba como protegemos seus dados</p>
                    </div>
                  </div>
                  <Link2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Password Dialog */}
      <ChangePasswordDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />
      
      {/* Parental Control Dialog */}
      <ParentalControlDialog open={showParentalDialog} onOpenChange={setShowParentalDialog} />
    </div>
  );
};

export default Settings;
