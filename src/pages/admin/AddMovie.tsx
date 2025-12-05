import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VideoUpload } from '@/components/admin/VideoUpload';
import { ThumbnailUpload } from '@/components/admin/ThumbnailUpload';
import { CoverUpload } from '@/components/admin/CoverUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const categories = ['Ação', 'Aventura', 'Comédia', 'Drama', 'Terror', 'Ficção Científica', 'Romance', 'Animação', 'Documentário'];
const ratings = ['Livre', '10', '12', '14', '16', '18'];

const AddMovie = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    cover: '',
    video_url: '',
    category: '',
    duration: '',
    release_year: '',
    rating: 'Livre',
    is_featured: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from('movies').insert({
      title: formData.title,
      description: formData.description || null,
      thumbnail: formData.thumbnail || null,
      cover: formData.cover || null,
      video_url: formData.video_url || null,
      category: formData.category || null,
      duration: formData.duration || null,
      release_year: formData.release_year ? parseInt(formData.release_year) : null,
      rating: formData.rating || 'Livre',
      is_featured: formData.is_featured,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o filme.',
        variant: 'destructive',
      });
      console.error(error);
    } else {
      toast({
        title: 'Sucesso!',
        description: 'Filme adicionado com sucesso.',
      });
      navigate('/admin/movies');
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
          <Film className="w-8 h-8 text-primary" />
          Adicionar Filme
        </h1>
        <p className="text-muted-foreground">
          Preencha os dados do novo filme
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do filme"
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Sinopse do filme"
                  className="bg-secondary/50 min-h-32 resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Classificação</Label>
                  <Select
                    value={formData.rating}
                    onValueChange={(value) => setFormData({ ...formData, rating: value })}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ratings.map((rating) => (
                        <SelectItem key={rating} value={rating}>
                          {rating}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="Ex: 2h 30min"
                    className="bg-secondary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Ano de Lançamento</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.release_year}
                    onChange={(e) => setFormData({ ...formData, release_year: e.target.value })}
                    placeholder="Ex: 2024"
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                <div>
                  <Label>Destaque</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir no carrossel principal
                  </p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>
            </div>

            {/* Cover Upload - for featured */}
            {formData.is_featured && (
              <div className="p-6 bg-card rounded-2xl border border-primary/50">
                <h3 className="font-display font-bold mb-2">Capa de Destaque</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Imagem widescreen (16:9) para o carrossel principal
                </p>
                <CoverUpload
                  onUploadComplete={(url) => setFormData({ ...formData, cover: url })}
                />
              </div>
            )}

            <div className="p-6 bg-card rounded-2xl border border-border">
              <h3 className="font-display font-bold mb-4">Vídeo</h3>
              <VideoUpload
                onUploadComplete={(url) => setFormData({ ...formData, video_url: url })}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-card rounded-2xl border border-border">
              <h3 className="font-display font-bold mb-4">Thumbnail</h3>
              <ThumbnailUpload
                onUploadComplete={(url) => setFormData({ ...formData, thumbnail: url })}
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={isLoading}
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Salvando...' : 'Salvar Filme'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddMovie;
