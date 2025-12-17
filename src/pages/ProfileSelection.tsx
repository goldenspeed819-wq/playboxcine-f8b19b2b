import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Settings, X, Trash2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LinkedProfile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  isCurrentUser: boolean;
}

const MAX_ACCOUNTS = 5;

const ProfileSelection = () => {
  const { user, profile, isLoading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [linkedProfiles, setLinkedProfiles] = useState<LinkedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    if (user && profile) {
      fetchLinkedAccounts();
    }
  }, [user, profile]);

  const fetchLinkedAccounts = async () => {
    if (!user || !profile) return;

    // Get all linked account IDs (where current user is primary or linked)
    const { data: links, error: linksError } = await supabase
      .from('linked_accounts')
      .select('primary_user_id, linked_user_id')
      .or(`primary_user_id.eq.${user.id},linked_user_id.eq.${user.id}`);

    if (linksError) {
      console.error('Error fetching linked accounts:', linksError);
      setIsLoading(false);
      return;
    }

    // Collect all unique user IDs
    const userIds = new Set<string>([user.id]);
    links?.forEach((link) => {
      userIds.add(link.primary_user_id);
      userIds.add(link.linked_user_id);
    });

    // Fetch profiles for all linked users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, username, avatar_url')
      .in('id', Array.from(userIds));

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setIsLoading(false);
      return;
    }

    const allProfiles: LinkedProfile[] = profiles?.map((p) => ({
      id: p.id,
      email: p.email,
      username: p.username,
      avatar_url: p.avatar_url,
      isCurrentUser: p.id === user.id,
    })) || [];

    // Current user should always appear first
    allProfiles.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return 0;
    });

    setLinkedProfiles(allProfiles);
    setIsLoading(false);
  };

  const handleSelectProfile = async (selectedProfile: LinkedProfile) => {
    if (selectedProfile.isCurrentUser) {
      localStorage.setItem('selectedProfile', JSON.stringify(selectedProfile));
      navigate('/browse');
    } else {
      // Switch to another account - sign out and redirect to auth
      toast.info('Para trocar de conta, faça login com as credenciais da outra conta.');
    }
  };

  const handleManageProfile = () => {
    navigate('/profile-setup');
  };

  const handleAddAccount = async () => {
    if (!user || !email.trim() || !password.trim()) return;

    if (linkedProfiles.length >= MAX_ACCOUNTS) {
      toast.error(`Limite máximo de ${MAX_ACCOUNTS} contas atingido`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (authTab === 'signup') {
        // Create new account
        const { error: signUpError } = await signUp(email.trim(), password);
        if (signUpError) {
          toast.error(signUpError.message || 'Erro ao criar conta');
          setIsSubmitting(false);
          return;
        }
        toast.success('Conta criada! Verifique seu email para confirmar.');
      } else {
        // Login to existing account - we need to verify credentials first
        // Create a temporary session to validate credentials
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) {
          toast.error(signInError.message || 'Credenciais inválidas');
          setIsSubmitting(false);
          return;
        }

        // Now link this account
        const linkedUserId = signInData.user?.id;
        if (linkedUserId && linkedUserId !== user.id) {
          // Sign back in as original user first
          // We need to store the link before switching back
          const { error: linkError } = await supabase
            .from('linked_accounts')
            .insert({
              primary_user_id: user.id,
              linked_user_id: linkedUserId,
            });

          if (linkError) {
            if (linkError.code === '23505') {
              toast.error('Esta conta já está vinculada');
            } else {
              console.error('Error linking account:', linkError);
              toast.error('Erro ao vincular conta');
            }
          } else {
            toast.success('Conta vinculada com sucesso!');
            fetchLinkedAccounts();
          }
        } else {
          toast.error('Não é possível vincular a mesma conta');
        }
      }

      setShowAddDialog(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Erro ao processar solicitação');
    }

    setIsSubmitting(false);
  };

  const handleUnlinkAccount = async (profileId: string) => {
    if (!user) return;

    // Delete the link
    const { error } = await supabase
      .from('linked_accounts')
      .delete()
      .or(`primary_user_id.eq.${user.id},linked_user_id.eq.${user.id}`)
      .or(`primary_user_id.eq.${profileId},linked_user_id.eq.${profileId}`);

    if (error) {
      console.error('Error unlinking account:', error);
      toast.error('Erro ao desvincular conta');
    } else {
      toast.success('Conta desvinculada');
      setLinkedProfiles(linkedProfiles.filter((p) => p.id !== profileId));
    }
    setShowDeleteConfirm(null);
  };

  if (authLoading || isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (profile && (!profile.username || !profile.avatar_url)) {
    navigate('/profile-setup');
    return null;
  }

  const canAddAccount = linkedProfiles.length < MAX_ACCOUNTS;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-12">
        Quem está assistindo?
      </h1>

      <div className="flex flex-wrap justify-center gap-6 mb-12">
        {/* Linked Accounts */}
        {linkedProfiles.map((linkedProfile) => (
          <div key={linkedProfile.id} className="relative group">
            <button
              onClick={() => handleSelectProfile(linkedProfile)}
              className="flex flex-col items-center gap-3 transition-transform hover:scale-105"
            >
              <div className={`w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-secondary border-2 transition-colors ${
                linkedProfile.isCurrentUser 
                  ? 'border-primary' 
                  : 'border-transparent group-hover:border-foreground'
              }`}>
                {linkedProfile.avatar_url ? (
                  <img
                    src={linkedProfile.avatar_url}
                    alt={linkedProfile.username || linkedProfile.email}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                )}
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm md:text-base max-w-28 md:max-w-36 truncate">
                {linkedProfile.username || linkedProfile.email.split('@')[0]}
              </span>
            </button>

            {/* Delete button for non-current users */}
            {!linkedProfile.isCurrentUser && (
              <button
                onClick={() => setShowDeleteConfirm(linkedProfile.id)}
                className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {/* Add Account Button */}
        {canAddAccount && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
          >
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-secondary/50 border-2 border-dashed border-muted-foreground/30 group-hover:border-foreground/50 transition-colors flex items-center justify-center">
              <Plus className="w-12 h-12 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm md:text-base">
              Adicionar conta
            </span>
          </button>
        )}
      </div>

      {/* Action Button */}
      <Button
        variant="outline"
        onClick={handleManageProfile}
        className="gap-2 px-6 py-2 border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
      >
        <Settings className="w-4 h-4" />
        Gerenciar perfil
      </Button>

      {/* Account Count */}
      <p className="mt-6 text-xs text-muted-foreground">
        {linkedProfiles.length} de {MAX_ACCOUNTS} contas
      </p>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar conta</DialogTitle>
          </DialogHeader>
          <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'login' | 'signup')} className="pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4 pt-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleAddAccount}
                  disabled={!email.trim() || !password.trim() || isSubmitting}
                >
                  <LogIn className="w-4 h-4" />
                  {isSubmitting ? 'Entrando...' : 'Vincular'}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Senha (mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleAddAccount}
                  disabled={!email.trim() || !password.trim() || password.length < 6 || isSubmitting}
                >
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? 'Criando...' : 'Criar conta'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Desvincular conta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta conta será removida da lista de perfis vinculados. A conta em si não será excluída.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => showDeleteConfirm && handleUnlinkAccount(showDeleteConfirm)}
            >
              <Trash2 className="w-4 h-4" />
              Desvincular
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSelection;
