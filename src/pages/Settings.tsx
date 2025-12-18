import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PageLoader } from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { User, Mail, Key, Palette, Shield, Trash2, Save, ChevronLeft } from 'lucide-react';
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

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setSelectedAvatar(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    fetchAvatars();
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

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-24 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Configurações
        </h1>
        <p className="text-muted-foreground mb-8">
          Gerencie sua conta e preferências
        </p>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Perfil</CardTitle>
                  <CardDescription>Altere suas informações de perfil</CardDescription>
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
                <Label>Avatar</Label>
                {isLoadingAvatars ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                    {avatars.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setSelectedAvatar(avatar.image_url)}
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-200 ${
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

          {/* Account Info Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Informações da conta</CardTitle>
                  <CardDescription>Dados da sua conta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
                  <p className="text-foreground font-medium">{profile?.email || user.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Código do usuário</Label>
                  <p className="text-foreground font-medium font-mono">{profile?.user_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
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
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Alterar senha</p>
                    <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: 'Em breve',
                      description: 'Esta funcionalidade estará disponível em breve.',
                    });
                  }}
                >
                  Alterar
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
              <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
