import { useState, useEffect } from 'react';
import { Crown, Plus, Trash2, Search, Shield, Eye, EyeOff, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

interface VIPUser {
  id: string;
  user_id: string;
  user_code: string;
  reason: string;
  no_ads: boolean;
  no_ip_ban: boolean;
  allow_devtools: boolean;
  created_at: string;
  profile?: {
    username: string;
    email: string;
  };
}

export default function ManageVIP() {
  const { profile } = useAuth();
  const [vipUsers, setVipUsers] = useState<VIPUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [searchUserCode, setSearchUserCode] = useState('');
  const [foundUser, setFoundUser] = useState<{ id: string; user_code: string; username: string } | null>(null);
  const [reason, setReason] = useState('VIP');
  const [noAds, setNoAds] = useState(true);
  const [noIpBan, setNoIpBan] = useState(true);
  const [allowDevtools, setAllowDevtools] = useState(true);

  // Check if user is Fundador
  const isFounder = profile?.user_code === 'User001' || profile?.user_code === 'Fundador';

  useEffect(() => {
    if (isFounder) {
      fetchVIPUsers();
    }
  }, [isFounder]);

  // If not founder, redirect
  if (!isFounder) {
    return <Navigate to="/admin" replace />;
  }

  const fetchVIPUsers = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('vip_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching VIP users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar usuários VIP.',
        variant: 'destructive',
      });
    } else {
      setVipUsers(data || []);
    }
    
    setIsLoading(false);
  };

  const searchUser = async () => {
    if (!searchUserCode.trim()) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_code, username')
      .ilike('user_code', `%${searchUserCode}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Usuário não encontrado',
        description: 'Verifique o código do usuário.',
        variant: 'destructive',
      });
      setFoundUser(null);
    } else {
      setFoundUser(data);
    }
  };

  const addVIPUser = async () => {
    if (!foundUser || !profile) return;

    // Check if already VIP
    const existing = vipUsers.find(v => v.user_id === foundUser.id);
    if (existing) {
      toast({
        title: 'Usuário já é VIP',
        description: 'Este usuário já está na lista VIP.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('vip_users').insert({
      user_id: foundUser.id,
      user_code: foundUser.user_code,
      added_by: profile.id,
      reason,
      no_ads: noAds,
      no_ip_ban: noIpBan,
      allow_devtools: allowDevtools,
    });

    if (error) {
      console.error('Error adding VIP user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar usuário VIP.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Usuário VIP adicionado',
        description: `${foundUser.user_code} agora é VIP.`,
      });
      setDialogOpen(false);
      resetForm();
      fetchVIPUsers();
    }
  };

  const updateVIPUser = async (userId: string, updates: Partial<VIPUser>) => {
    const { error } = await supabase
      .from('vip_users')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating VIP user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Atualizado com sucesso' });
      fetchVIPUsers();
    }
  };

  const removeVIPUser = async (id: string, userCode: string) => {
    if (!confirm(`Remover ${userCode} da lista VIP?`)) return;

    const { error } = await supabase
      .from('vip_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing VIP user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Usuário removido da lista VIP' });
      fetchVIPUsers();
    }
  };

  const resetForm = () => {
    setSearchUserCode('');
    setFoundUser(null);
    setReason('VIP');
    setNoAds(true);
    setNoIpBan(true);
    setAllowDevtools(true);
  };

  const filteredUsers = vipUsers.filter(user =>
    user.user_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Gerenciar VIPs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Usuários VIP não veem anúncios, não levam ban por IP e podem usar F12
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar VIP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Usuário VIP</DialogTitle>
              <DialogDescription>
                Busque pelo código do usuário e configure as permissões.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Search User */}
              <div className="space-y-2">
                <Label>Código do Usuário</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="User001"
                    value={searchUserCode}
                    onChange={(e) => setSearchUserCode(e.target.value)}
                  />
                  <Button onClick={searchUser} variant="secondary">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                {foundUser && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm font-medium text-green-500">
                      ✓ Encontrado: {foundUser.username || foundUser.user_code}
                    </p>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Motivo/Descrição</Label>
                <Input
                  placeholder="VIP, Equipe, Tester..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {/* Permissions */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Permissões
                </h4>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Sem anúncios</span>
                  </div>
                  <Switch checked={noAds} onCheckedChange={setNoAds} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Imune a ban por IP</span>
                  </div>
                  <Switch checked={noIpBan} onCheckedChange={setNoIpBan} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Pode usar F12/DevTools</span>
                  </div>
                  <Switch checked={allowDevtools} onCheckedChange={setAllowDevtools} />
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={addVIPUser}
                disabled={!foundUser}
              >
                <Crown className="w-4 h-4 mr-2" />
                Adicionar como VIP
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total VIPs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vipUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sem Anúncios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {vipUsers.filter(v => v.no_ads).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              DevTools Liberado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {vipUsers.filter(v => v.allow_devtools).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código ou motivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* VIP Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários VIP</CardTitle>
          <CardDescription>
            Gerencie as permissões especiais de cada usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum usuário VIP cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-center">Sem Ads</TableHead>
                  <TableHead className="text-center">Sem Ban IP</TableHead>
                  <TableHead className="text-center">DevTools</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        {user.user_code}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.reason}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={user.no_ads}
                        onCheckedChange={(checked) => 
                          updateVIPUser(user.user_id, { no_ads: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={user.no_ip_ban}
                        onCheckedChange={(checked) => 
                          updateVIPUser(user.user_id, { no_ip_ban: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={user.allow_devtools}
                        onCheckedChange={(checked) => 
                          updateVIPUser(user.user_id, { allow_devtools: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVIPUser(user.id, user.user_code)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
