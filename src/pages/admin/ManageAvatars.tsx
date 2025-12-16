import { useState, useEffect } from 'react';
import { Plus, Trash2, Film, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Avatar {
  id: string;
  image_url: string;
  character_name: string | null;
  movie_id: string | null;
  series_id: string | null;
}

interface Content {
  id: string;
  title: string;
}

const ManageAvatars = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [movies, setMovies] = useState<Content[]>([]);
  const [series, setSeries] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [contentType, setContentType] = useState<'movie' | 'series'>('movie');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [avatarsRes, moviesRes, seriesRes] = await Promise.all([
      supabase.from('avatars').select('*').order('created_at', { ascending: false }),
      supabase.from('movies').select('id, title').order('title'),
      supabase.from('series').select('id, title').order('title')
    ]);

    if (avatarsRes.data) setAvatars(avatarsRes.data);
    if (moviesRes.data) setMovies(moviesRes.data);
    if (seriesRes.data) setSeries(seriesRes.data);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedContentId || !imageUrl.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('avatars').insert({
        movie_id: contentType === 'movie' ? selectedContentId : null,
        series_id: contentType === 'series' ? selectedContentId : null,
        image_url: imageUrl.trim(),
        character_name: characterName.trim() || null
      });

      if (error) throw error;

      toast({
        title: 'Avatar adicionado!',
        description: 'O avatar foi adicionado com sucesso.',
      });

      // Reset form
      setImageUrl('');
      setCharacterName('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar avatar.',
        variant: 'destructive'
      });
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este avatar?')) return;

    try {
      const { error } = await supabase.from('avatars').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Avatar excluído!',
        description: 'O avatar foi removido com sucesso.',
      });

      setAvatars(avatars.filter(a => a.id !== id));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir avatar.',
        variant: 'destructive'
      });
    }
  };

  const getContentTitle = (avatar: Avatar) => {
    if (avatar.movie_id) {
      return movies.find(m => m.id === avatar.movie_id)?.title || 'Filme desconhecido';
    }
    if (avatar.series_id) {
      return series.find(s => s.id === avatar.series_id)?.title || 'Série desconhecida';
    }
    return 'Sem conteúdo';
  };

  const contentOptions = contentType === 'movie' ? movies : series;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Gerenciar Avatars</h1>
        <p className="text-muted-foreground mt-2">
          Adicione fotos de personagens/atores para os usuários usarem como avatar.
        </p>
      </div>

      {/* Add Avatar Form */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-display text-xl font-bold mb-4">Adicionar Avatar</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Conteúdo</Label>
              <Select value={contentType} onValueChange={(v) => {
                setContentType(v as 'movie' | 'series');
                setSelectedContentId('');
              }}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4" />
                      Filme
                    </div>
                  </SelectItem>
                  <SelectItem value="series">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4" />
                      Série
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{contentType === 'movie' ? 'Filme' : 'Série'} *</Label>
              <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {contentOptions.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL da Imagem *</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/avatar.jpg"
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome do Personagem</Label>
              <Input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Ex: Tony Stark"
                className="bg-secondary/50"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Adicionando...' : 'Adicionar Avatar'}
          </Button>
        </form>
      </div>

      {/* Avatars Grid */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-display text-xl font-bold mb-4">
          Avatars Cadastrados ({avatars.length})
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : avatars.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum avatar cadastrado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {avatars.map(avatar => (
              <div key={avatar.id} className="group relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                  <img
                    src={avatar.image_url}
                    alt={avatar.character_name || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium truncate">
                    {avatar.character_name || 'Sem nome'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    {avatar.movie_id ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                    {getContentTitle(avatar)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(avatar.id)}
                  className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageAvatars;
