import { useState, useEffect, useRef } from 'react';
import { Wand2, Trash2, Film, Tv, RefreshCw, Upload, Plus, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  thumbnail: string | null;
}

const ManageAvatars = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [movies, setMovies] = useState<Content[]>([]);
  const [series, setSeries] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Manual upload state
  const [manualName, setManualName] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [avatarsRes, moviesRes, seriesRes] = await Promise.all([
      supabase.from('avatars').select('*').order('created_at', { ascending: false }),
      supabase.from('movies').select('id, title, thumbnail').order('title'),
      supabase.from('series').select('id, title, thumbnail').order('title')
    ]);

    if (avatarsRes.data) setAvatars(avatarsRes.data);
    if (moviesRes.data) setMovies(moviesRes.data);
    if (seriesRes.data) setSeries(seriesRes.data);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateAvatarsFromThumbnails = async () => {
    setIsGenerating(true);

    try {
      const newAvatars: { movie_id?: string; series_id?: string; image_url: string; character_name: string }[] = [];

      // Generate from movies
      for (const movie of movies) {
        if (movie.thumbnail) {
          const exists = avatars.some(a => a.movie_id === movie.id && a.image_url === movie.thumbnail);
          if (!exists) {
            newAvatars.push({
              movie_id: movie.id,
              image_url: movie.thumbnail,
              character_name: movie.title
            });
          }
        }
      }

      // Generate from series
      for (const s of series) {
        if (s.thumbnail) {
          const exists = avatars.some(a => a.series_id === s.id && a.image_url === s.thumbnail);
          if (!exists) {
            newAvatars.push({
              series_id: s.id,
              image_url: s.thumbnail,
              character_name: s.title
            });
          }
        }
      }

      if (newAvatars.length === 0) {
        toast({
          title: 'Nenhum novo avatar',
          description: 'Todos os avatars já foram gerados.',
        });
        setIsGenerating(false);
        return;
      }

      const { error } = await supabase.from('avatars').insert(newAvatars);

      if (error) throw error;

      toast({
        title: 'Avatars gerados!',
        description: `${newAvatars.length} avatars criados a partir das thumbnails.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao gerar avatars.',
        variant: 'destructive'
      });
    }

    setIsGenerating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(filePath);

      setManualImageUrl(publicUrl);
      toast({
        title: 'Imagem carregada!',
        description: 'A imagem foi enviada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message || 'Erro ao fazer upload da imagem.',
        variant: 'destructive'
      });
      setPreviewImage(null);
    }
    setIsUploading(false);
  };

  const handleManualAdd = async () => {
    if (!manualImageUrl) {
      toast({
        title: 'Erro',
        description: 'Faça upload de uma imagem ou insira a URL.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.from('avatars').insert({
        image_url: manualImageUrl,
        character_name: manualName || 'Avatar Personalizado'
      });

      if (error) throw error;

      toast({
        title: 'Avatar adicionado!',
        description: 'O avatar foi criado com sucesso.',
      });

      setManualName('');
      setManualImageUrl('');
      setPreviewImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar avatar.',
        variant: 'destructive'
      });
    }
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

  const deleteAllAvatars = async () => {
    if (!confirm('Tem certeza que deseja excluir TODOS os avatars? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase.from('avatars').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      toast({
        title: 'Avatars excluídos!',
        description: 'Todos os avatars foram removidos.',
      });

      setAvatars([]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir avatars.',
        variant: 'destructive'
      });
    }
  };

  const getContentTitle = (avatar: Avatar) => {
    if (avatar.movie_id) {
      return movies.find(m => m.id === avatar.movie_id)?.title || 'Filme';
    }
    if (avatar.series_id) {
      return series.find(s => s.id === avatar.series_id)?.title || 'Série';
    }
    return avatar.character_name || 'Personalizado';
  };

  const moviesWithThumbnails = movies.filter(m => m.thumbnail).length;
  const seriesWithThumbnails = series.filter(s => s.thumbnail).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Gerenciar Avatars</h1>
        <p className="text-muted-foreground mt-2">
          Adicione avatars manualmente ou gere automaticamente a partir das thumbnails.
        </p>
      </div>

      {/* Manual Add Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Adicionar Avatar Manualmente</h2>
        </div>

        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          {/* Image Upload */}
          <div className="space-y-3">
            <Label>Imagem do Avatar</Label>
            <div 
              className="aspect-square rounded-lg border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Image className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="manualName">Nome do Avatar (opcional)</Label>
              <Input
                id="manualName"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ex: Homem de Ferro, Naruto..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="manualUrl">Ou cole a URL da imagem</Label>
              <Input
                id="manualUrl"
                value={manualImageUrl}
                onChange={(e) => {
                  setManualImageUrl(e.target.value);
                  setPreviewImage(e.target.value);
                }}
                placeholder="https://exemplo.com/imagem.jpg"
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleManualAdd}
              disabled={isUploading || !manualImageUrl}
              className="w-full md:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Enviando...' : 'Adicionar Avatar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Auto Generate Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold">Gerar Avatars Automaticamente</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {moviesWithThumbnails} filmes e {seriesWithThumbnails} séries com thumbnails disponíveis
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={generateAvatarsFromThumbnails}
              disabled={isGenerating}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isGenerating ? 'Gerando...' : 'Gerar Avatars'}
            </Button>
            <Button 
              variant="outline"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-secondary/30 rounded-lg p-4">
            <Film className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{movies.length}</p>
            <p className="text-sm text-muted-foreground">Filmes</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <Tv className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{series.length}</p>
            <p className="text-sm text-muted-foreground">Séries</p>
          </div>
        </div>
      </div>

      {/* Avatars Grid */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">
            Avatars Cadastrados ({avatars.length})
          </h2>
          {avatars.length > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteAllAvatars}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Todos
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Nenhum avatar cadastrado ainda.</p>
            <Button onClick={generateAvatarsFromThumbnails} disabled={isGenerating}>
              <Wand2 className="w-4 h-4 mr-2" />
              Gerar Avatars Agora
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
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
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    {avatar.movie_id ? <Film className="w-3 h-3" /> : avatar.series_id ? <Tv className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                    {getContentTitle(avatar)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(avatar.id)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
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
