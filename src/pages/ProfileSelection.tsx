import { useNavigate } from 'react-router-dom';
import { User, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/LoadingSpinner';

const ProfileSelection = () => {
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
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

  const handleSelectProfile = () => {
    navigate('/browse');
  };

  const handleManageProfile = () => {
    navigate('/profile-setup');
  };

  const handleAddAccount = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-12">
        Quem está assistindo?
      </h1>

      <div className="flex flex-wrap justify-center gap-6 mb-12">
        {/* User Profile */}
        <button
          onClick={handleSelectProfile}
          className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
        >
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-secondary border-2 border-transparent group-hover:border-foreground transition-colors">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username || 'Perfil'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/20">
                <User className="w-12 h-12 text-primary" />
              </div>
            )}
          </div>
          <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm md:text-base">
            {profile?.username || 'Usuário'}
          </span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={handleManageProfile}
          className="gap-2 px-6 py-2 border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
        >
          <Settings className="w-4 h-4" />
          Gerenciar perfis
        </Button>
        <Button
          variant="outline"
          onClick={handleAddAccount}
          className="gap-2 px-6 py-2 border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
        >
          <Plus className="w-4 h-4" />
          Adicionar conta
        </Button>
      </div>
    </div>
  );
};

export default ProfileSelection;
