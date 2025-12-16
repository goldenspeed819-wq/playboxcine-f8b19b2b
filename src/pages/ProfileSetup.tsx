import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Avatar {
  id: string;
  image_url: string;
  character_name: string | null;
}

interface ContentWithAvatars {
  id: string;
  title: string;
  type: 'movie' | 'series';
  avatars: Avatar[];
}

const ProfileSetup = () => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contentWithAvatars, setContentWithAvatars] = useState<ContentWithAvatars[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchAvatars = async () => {
      setLoadingContent(true);
      
      // Fetch movies with avatars
      const { data: movies } = await supabase
        .from('movies')
        .select('id, title')
        .limit(15);

      // Fetch series with avatars
      const { data: series } = await supabase
        .from('series')
        .select('id, title')
        .limit(15);

      // Fetch all avatars
      const { data: avatars } = await supabase
        .from('avatars')
        .select('*');

      const content: ContentWithAvatars[] = [];

      // Map movies with their avatars
      movies?.forEach(movie => {
        const movieAvatars = avatars?.filter(a => a.movie_id === movie.id) || [];
        if (movieAvatars.length > 0) {
          content.push({
            id: movie.id,
            title: movie.title,
            type: 'movie',
            avatars: movieAvatars
          });
        }
      });

      // Map series with their avatars
      series?.forEach(s => {
        const seriesAvatars = avatars?.filter(a => a.series_id === s.id) || [];
        if (seriesAvatars.length > 0) {
          content.push({
            id: s.id,
            title: s.title,
            type: 'series',
            avatars: seriesAvatars
          });
        }
      });

      setContentWithAvatars(content);
      setLoadingContent(false);
    };

    fetchAvatars();
  }, []);

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um nome de usuário.',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedAvatar) {
      toast({
        title: 'Erro',
        description: 'Selecione uma foto de perfil.',
        variant: 'destructive'
      });
      return;
    }

    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          avatar_url: selectedAvatar,
          profile_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil configurado!',
        description: 'Seu perfil foi salvo com sucesso.',
      });
      
      // Reload to update profile context
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar perfil.',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-display font-bold text-xl">Editar perfil</h1>
              <p className="text-sm text-muted-foreground">Escolha o ícone do seu perfil.</p>
            </div>
          </div>
          
          {/* Current selection preview */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{username || 'Seu nome'}</span>
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center">
              {selectedAvatar ? (
                <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Username input */}
        <div className="max-w-md mb-8">
          <Label htmlFor="username" className="text-sm font-semibold mb-2 block">
            Nome de usuário
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu nome de usuário"
            className="bg-secondary/50 border-border focus:border-primary"
            maxLength={20}
          />
        </div>

        {/* Avatar selection */}
        <ScrollArea className="h-[calc(100vh-300px)]">
          {loadingContent ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : contentWithAvatars.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum avatar disponível ainda.</p>
              <p className="text-sm mt-2">Os administradores podem adicionar avatars no painel.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {contentWithAvatars.map((content) => (
                <div key={content.id}>
                  <h2 className="font-display font-bold text-lg mb-4 uppercase tracking-wider">
                    {content.title}
                  </h2>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {content.avatars.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setSelectedAvatar(avatar.image_url)}
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-200 ${
                          selectedAvatar === avatar.image_url
                            ? 'ring-4 ring-primary scale-105'
                            : 'hover:scale-105 hover:ring-2 hover:ring-primary/50'
                        }`}
                      >
                        <img
                          src={avatar.image_url}
                          alt={avatar.character_name || 'Avatar'}
                          className="w-full h-full object-cover"
                        />
                        {selectedAvatar === avatar.image_url && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4">
          <div className="container mx-auto max-w-md">
            <Button
              onClick={handleSubmit}
              className="w-full h-12 font-semibold neon-glow"
              disabled={isLoading || !username.trim() || !selectedAvatar}
            >
              {isLoading ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
