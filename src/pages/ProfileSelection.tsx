import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Settings, X } from 'lucide-react';
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

interface SubProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_primary: boolean;
  created_at: string;
}

const MAX_PROFILES = 5;

const ProfileSelection = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subProfiles, setSubProfiles] = useState<SubProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchSubProfiles();
    }
  }, [user, profile]);

  const fetchSubProfiles = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('sub_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching sub-profiles:', error);
      setIsLoading(false);
      return;
    }

    // If no sub-profiles exist, create the primary one from main profile
    if (!data || data.length === 0) {
      if (profile?.username && profile?.avatar_url) {
        const { data: newProfile, error: createError } = await supabase
          .from('sub_profiles')
          .insert({
            user_id: user.id,
            name: profile.username,
            avatar_url: profile.avatar_url,
            is_primary: true,
          })
          .select()
          .single();

        if (!createError && newProfile) {
          setSubProfiles([newProfile]);
        }
      }
    } else {
      setSubProfiles(data);
    }

    setIsLoading(false);
  };

  const handleSelectProfile = (subProfile: SubProfile) => {
    // Store selected profile in localStorage for use across the app
    localStorage.setItem('selectedProfile', JSON.stringify(subProfile));
    navigate('/browse');
  };

  const handleManageProfile = () => {
    navigate('/profile-setup');
  };

  const handleAddProfile = async () => {
    if (!user || !newProfileName.trim()) return;

    if (subProfiles.length >= MAX_PROFILES) {
      toast.error(`Limite máximo de ${MAX_PROFILES} perfis atingido`);
      return;
    }

    setIsCreating(true);

    const { data, error } = await supabase
      .from('sub_profiles')
      .insert({
        user_id: user.id,
        name: newProfileName.trim(),
        avatar_url: null,
        is_primary: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      toast.error('Erro ao criar perfil');
    } else if (data) {
      setSubProfiles([...subProfiles, data]);
      toast.success('Perfil criado com sucesso!');
      setShowAddDialog(false);
      setNewProfileName('');
    }

    setIsCreating(false);
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

  const canAddProfile = subProfiles.length < MAX_PROFILES;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-12">
        Quem está assistindo?
      </h1>

      <div className="flex flex-wrap justify-center gap-6 mb-12">
        {/* Existing Profiles */}
        {subProfiles.map((subProfile) => (
          <button
            key={subProfile.id}
            onClick={() => handleSelectProfile(subProfile)}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
          >
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-secondary border-2 border-transparent group-hover:border-foreground transition-colors">
              {subProfile.avatar_url ? (
                <img
                  src={subProfile.avatar_url}
                  alt={subProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/20">
                  <User className="w-12 h-12 text-primary" />
                </div>
              )}
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm md:text-base">
              {subProfile.name}
            </span>
          </button>
        ))}

        {/* Add Profile Button */}
        {canAddProfile && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
          >
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-secondary/50 border-2 border-dashed border-muted-foreground/30 group-hover:border-foreground/50 transition-colors flex items-center justify-center">
              <Plus className="w-12 h-12 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm md:text-base">
              Adicionar perfil
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
        Gerenciar perfis
      </Button>

      {/* Profile Count */}
      <p className="mt-6 text-xs text-muted-foreground">
        {subProfiles.length} de {MAX_PROFILES} perfis
      </p>

      {/* Add Profile Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar novo perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>
            <Input
              placeholder="Nome do perfil"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              maxLength={20}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewProfileName('');
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddProfile}
                disabled={!newProfileName.trim() || isCreating}
              >
                {isCreating ? 'Criando...' : 'Criar perfil'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSelection;
