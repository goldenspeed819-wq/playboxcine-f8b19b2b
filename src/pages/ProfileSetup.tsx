import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Garfield',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Missy',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Tiger',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Chester',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Simba',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
];

const ProfileSetup = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setIsLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        avatar_url: selectedAvatar,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o perfil.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Perfil criado!',
        description: 'Bem-vindo ao PlayBox Cine!',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center neon-glow">
              <span className="font-display font-bold text-xl text-primary-foreground">P</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">
                <span className="text-primary">Play</span>
                <span className="text-foreground">Box</span>
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Cine</p>
            </div>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Configure seu Perfil
          </h2>
          <p className="text-muted-foreground">
            Escolha um avatar e um nome para exibir
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Selection */}
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Escolha seu Avatar
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_OPTIONS.map((avatar, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedAvatar === avatar
                      ? 'border-primary ring-2 ring-primary/50 scale-105'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover bg-secondary"
                  />
                  {selectedAvatar === avatar && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Seu Nome
            </h3>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como você quer ser chamado?"
              className="bg-secondary/50 border-border focus:border-primary text-lg h-12"
              maxLength={30}
              required
            />
            <p className="text-xs text-muted-foreground">
              Este nome será exibido em comentários e no seu perfil.
            </p>
          </div>

          {/* Preview */}
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h3 className="font-semibold mb-4">Prévia do Perfil</h3>
            <div className="flex items-center gap-4">
              <img
                src={selectedAvatar}
                alt="Preview"
                className="w-16 h-16 rounded-full border-2 border-primary bg-secondary"
              />
              <div>
                <p className="font-semibold text-lg">
                  {displayName || 'Seu nome aqui'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile?.user_code || 'UserXXX'}
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 font-semibold neon-glow text-lg"
            disabled={isLoading || !displayName.trim()}
          >
            {isLoading ? 'Salvando...' : 'Começar a Assistir'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
