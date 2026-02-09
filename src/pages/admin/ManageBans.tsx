import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  UserX,
  Search,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  Ban,
  Shield,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface BannedUser {
  id: string;
  user_id: string;
  user_code: string;
  reason: string;
  banned_at: string;
  expires_at: string | null;
  is_permanent: boolean;
}

const ManageBans = () => {
  const { user } = useAuth();
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [banDuration, setBanDuration] = useState('24h');
  const [banReason, setBanReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  const fetchBannedUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('banned_users')
        .select('*')
        .order('banned_at', { ascending: false });

      if (error) throw error;
      setBannedUsers(data || []);
    } catch (error) {
      console.error('Error fetching banned users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!searchCode.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o código do usuário',
        variant: 'destructive',
      });
      return;
    }

    setIsBanning(true);
    try {
      // Find user by code
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_code')
        .eq('user_code', searchCode.trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!userProfile) {
        toast({
          title: 'Usuário não encontrado',
          description: `Nenhum usuário encontrado com o código ${searchCode}`,
          variant: 'destructive',
        });
        setIsBanning(false);
        return;
      }

      // Prevent banning Fundador
      if (userProfile.user_code === 'User001' || userProfile.user_code === 'Fundador') {
        toast({
          title: 'Ação não permitida',
          description: 'O Fundador não pode ser banido',
          variant: 'destructive',
        });
        setIsBanning(false);
        return;
      }

      // Check if user is VIP
      const { data: vipData } = await supabase
        .from('vip_users')
        .select('id')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (vipData) {
        toast({
          title: 'Ação não permitida',
          description: 'Usuários VIP não podem ser banidos',
          variant: 'destructive',
        });
        setIsBanning(false);
        return;
      }

      // Check if already banned
      const { data: existingBan } = await supabase
        .from('banned_users')
        .select('id')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (existingBan) {
        toast({
          title: 'Usuário já banido',
          description: 'Este usuário já está na lista de banidos',
          variant: 'destructive',
        });
        setIsBanning(false);
        return;
      }

      // Calculate expiration
      let expiresAt: string | null = null;
      let isPermanent = false;

      if (banDuration === 'permanent') {
        isPermanent = true;
      } else {
        const now = new Date();
        const hours = parseInt(banDuration.replace('h', ''));
        expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
      }

      // Ban user
      const { error: banError } = await supabase
        .from('banned_users')
        .insert({
          user_id: userProfile.id,
          user_code: userProfile.user_code,
          banned_by: user?.id,
          reason: banReason.trim() || 'Violação dos termos de uso',
          expires_at: expiresAt,
          is_permanent: isPermanent,
        });

      if (banError) throw banError;

      toast({
        title: 'Usuário banido',
        description: `${userProfile.user_code} foi banido com sucesso`,
      });

      setSearchCode('');
      setBanReason('');
      fetchBannedUsers();
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast({
        title: 'Erro ao banir',
        description: error.message || 'Não foi possível banir o usuário',
        variant: 'destructive',
      });
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnban = async (banId: string, userCode: string) => {
    try {
      const { error } = await supabase
        .from('banned_users')
        .delete()
        .eq('id', banId);

      if (error) throw error;

      toast({
        title: 'Banimento removido',
        description: `${userCode} foi desbanido com sucesso`,
      });

      fetchBannedUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o banimento',
        variant: 'destructive',
      });
    }
  };

  const formatTimeRemaining = (expiresAt: string | null, isPermanent: boolean) => {
    if (isPermanent) return 'Permanente';
    if (!expiresAt) return 'Indefinido';

    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expirado';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} dia${days > 1 ? 's' : ''}`;
    }

    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Gerenciar Banimentos
        </h1>
        <p className="text-white/50 mt-1">
          Área restrita - Apenas fundadores podem gerenciar banimentos
        </p>
      </div>

      {/* Ban Form */}
      <div className="bg-[#16161f] rounded-2xl border border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Ban className="w-5 h-5 text-destructive" />
          Banir Usuário
        </h2>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="user-code">Código do Usuário</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                id="user-code"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Ex: User001"
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duração</Label>
            <Select value={banDuration} onValueChange={setBanDuration}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hora</SelectItem>
                <SelectItem value="6h">6 Horas</SelectItem>
                <SelectItem value="24h">24 Horas</SelectItem>
                <SelectItem value="72h">3 Dias</SelectItem>
                <SelectItem value="168h">7 Dias</SelectItem>
                <SelectItem value="720h">30 Dias</SelectItem>
                <SelectItem value="permanent">Permanente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Input
              id="reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Motivo do banimento"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleBanUser}
              disabled={isBanning || !searchCode.trim()}
              variant="destructive"
              className="w-full"
            >
              {isBanning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserX className="w-4 h-4 mr-2" />
              )}
              Banir
            </Button>
          </div>
        </div>
      </div>

      {/* Banned Users List */}
      <div className="bg-[#16161f] rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Usuários Banidos ({bannedUsers.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : bannedUsers.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            Nenhum usuário banido
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {bannedUsers.map((ban) => (
              <div
                key={ban.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <UserX className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{ban.user_code}</p>
                    <p className="text-sm text-white/50">{ban.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-white/40" />
                      <span className={ban.is_permanent ? 'text-destructive' : 'text-white/70'}>
                        {formatTimeRemaining(ban.expires_at, ban.is_permanent)}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">
                      Banido em {new Date(ban.banned_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white/40 hover:text-green-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover banimento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso irá desbanir o usuário {ban.user_code} e permitir que ele acesse a plataforma novamente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUnban(ban.id, ban.user_code)}>
                          Desbanir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageBans;
