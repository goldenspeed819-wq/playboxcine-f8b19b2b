import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  user_id: string;
  user_code: string;
  email: string;
}

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);
    
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, user_id')
      .eq('role', 'admin');
    
    if (rolesError) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os administradores.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!rolesData || rolesData.length === 0) {
      setAdmins([]);
      setIsLoading(false);
      return;
    }

    const userIds = rolesData.map(r => r.user_id);
    
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, user_code, email')
      .in('id', userIds);

    if (profilesData) {
      const adminList = rolesData.map(role => {
        const profile = profilesData.find(p => p.id === role.user_id);
        return {
          id: role.id,
          user_id: role.user_id,
          user_code: profile?.user_code || 'N/A',
          email: profile?.email || 'N/A',
        };
      });
      setAdmins(adminList);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!searchCode.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o código do usuário (ex: User001).',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_code, email')
      .eq('user_code', searchCode.trim())
      .single();

    if (profileError || !profile) {
      toast({
        title: 'Usuário não encontrado',
        description: `Não existe usuário com o código ${searchCode}.`,
        variant: 'destructive',
      });
      setIsAdding(false);
      return;
    }

    const existingAdmin = admins.find(a => a.user_id === profile.id);
    if (existingAdmin) {
      toast({
        title: 'Já é admin',
        description: `${searchCode} já é um administrador.`,
        variant: 'destructive',
      });
      setIsAdding(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        role: 'admin',
      });

    if (insertError) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o administrador.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `${searchCode} agora é administrador.`,
      });
      setSearchCode('');
      fetchAdmins();
    }

    setIsAdding(false);
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (admin.user_code === 'User001') {
      toast({
        title: 'Ação não permitida',
        description: 'O User001 não pode ser removido como administrador.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', admin.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o administrador.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Removido',
        description: `${admin.user_code} não é mais administrador.`,
      });
      fetchAdmins();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-bold">Gerenciar Administradores</h1>
          <p className="text-muted-foreground">Adicione ou remova administradores pelo ID</p>
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border">
        <h2 className="text-lg font-semibold mb-4">Adicionar Administrador</h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Digite o código (ex: User001)"
              className="pl-10"
            />
          </div>
          <Button onClick={handleAddAdmin} disabled={isAdding}>
            <UserPlus className="w-4 h-4 mr-2" />
            {isAdding ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </div>
      </div>

      <div className="p-6 bg-card rounded-xl border border-border">
        <h2 className="text-lg font-semibold mb-4">Administradores Atuais</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : admins.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum administrador encontrado.
          </p>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{admin.user_code}</p>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAdmin(admin)}
                  disabled={admin.user_code === 'User001'}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageAdmins;
