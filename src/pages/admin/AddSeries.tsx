import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv, Save } from 'lucide-react';
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
import { ThumbnailUpload } from '@/components/admin/ThumbnailUpload';
import { TMDBSearch } from '@/components/admin/TMDBSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CATEGORIES, RATINGS } from '@/constants/categories';

const AddSeries = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    category: '',
    release_year: '',
    rating: 'Livre',
    is_featured: false,
    is_release: false,
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

    const { error } = await supabase.from('series').insert({
      title: formData.title,
      description: formData.description || null,
      thumbnail: formData.thumbnail || null,
      category: formData.category || null,
      release_year: formData.release_year ? parseInt(formData.release_year) : null,
      rating: formData.rating || 'Livre',
      is_featured: formData.is_featured,
      is_release: formData.is_release,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a série.',
        variant: 'destructive',
      });
      console.error(error);
    } else {
      toast({
        title: 'Sucesso!',
        description: 'Série adicionada com sucesso.',
      });
      navigate('/admin/series');
    }

    setIsLoading(false);
  };

  const handleTMDBSelect = (data: any) => {
    setFormData(prev => ({
      ...prev,
      title: data.title || prev.title,
      description: data.overview || prev.description,
      thumbnail: data.posterUrl || prev.thumbnail,
      category: data.genres?.[0] || prev.category,
      release_year: data.releaseYear?.toString() || prev.release_year,
      rating: data.contentRating || prev.rating,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Tv className="w-8 h-8 text-primary" />
            Adicionar Série
          </h1>
          <p className="text-muted-foreground">
            Preencha os dados da nova série
          </p>
        </div>
        <TMDBSearch type="tv" onSelect={handleTMDBSelect} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome da série"
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Sinopse da série"
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
                      {CATEGORIES.map((cat) => (
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
                      {RATINGS.map((rating) => (
                        <SelectItem key={rating} value={rating}>
                          {rating}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                <div>
                  <Label>Lançamento</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir na seção de lançamentos
                  </p>
                </div>
                <Switch
                  checked={formData.is_release}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_release: checked })}
                />
              </div>
            </div>

            <div className="p-6 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground text-sm">
                💡 <strong>Dica:</strong> Após criar a série, você poderá adicionar episódios editando-a na lista de séries.
              </p>
            </div>
          </div>

          {/* Sidebar */}
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
              {isLoading ? 'Salvando...' : 'Salvar Série'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddSeries;
