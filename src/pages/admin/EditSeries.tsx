import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tv, Save, ArrowLeft, Plus, Trash2, Play, AlertTriangle, Pencil, Camera, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ThumbnailUpload } from '@/components/admin/ThumbnailUpload';
import { VideoUpload } from '@/components/admin/VideoUpload';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Series, Episode } from '@/types/database';
import { captureVideoFrame, parseTimeToSeconds } from '@/utils/videoThumbnail';
import { CATEGORIES, RATINGS } from '@/constants/categories';

const DELETE_PASSWORD = '*****';

const EditSeries = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [thumbnailTime, setThumbnailTime] = useState('');
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

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

  const [episodeForm, setEpisodeForm] = useState({
    season: '1',
    episode: '1',
    title: '',
    description: '',
    video_url: '',
    thumbnail: '',
    duration: '',
    intro_start: '',
    intro_end: '',
  });

  useEffect(() => {
    if (id) {
      fetchSeries();
      fetchEpisodes();
    }
  }, [id]);

  const fetchSeries = async () => {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Erro',
        description: 'Série não encontrada.',
        variant: 'destructive',
      });
      navigate('/admin/series');
      return;
    }

    setFormData({
      title: data.title || '',
      description: data.description || '',
      thumbnail: data.thumbnail || '',
      category: data.category || '',
      release_year: data.release_year?.toString() || '',
      rating: data.rating || 'Livre',
      is_featured: data.is_featured || false,
      is_release: data.is_release || false,
    });
    setIsLoading(false);
  };

  const fetchEpisodes = async () => {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('series_id', id)
      .order('season', { ascending: true })
      .order('episode', { ascending: true });

    if (!error && data) {
      setEpisodes(data);
    }
  };

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

    setIsSaving(true);

    const { error } = await supabase
      .from('series')
      .update({
        title: formData.title,
        description: formData.description || null,
        thumbnail: formData.thumbnail || null,
        category: formData.category || null,
        release_year: formData.release_year ? parseInt(formData.release_year) : null,
        rating: formData.rating || 'Livre',
        is_featured: formData.is_featured,
        is_release: formData.is_release,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a série.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso!',
        description: 'Série atualizada com sucesso.',
      });
    }

    setIsSaving(false);
  };

  const resetEpisodeForm = () => {
    setEpisodeForm({
      season: '1',
      episode: '1',
      title: '',
      description: '',
      video_url: '',
      thumbnail: '',
      duration: '',
      intro_start: '',
      intro_end: '',
    });
    setEditingEpisode(null);
    setThumbnailTime('');
  };

  const handleGenerateThumbnail = async () => {
    if (!episodeForm.video_url) {
      toast({
        title: 'Erro',
        description: 'Adicione o vídeo primeiro para gerar a thumbnail.',
        variant: 'destructive',
      });
      return;
    }

    if (!thumbnailTime) {
      toast({
        title: 'Erro',
        description: 'Informe o tempo da cena (ex: 1:30 ou 90).',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingThumbnail(true);

    try {
      const seconds = parseTimeToSeconds(thumbnailTime);
      const blob = await captureVideoFrame(episodeForm.video_url, seconds);

      // Upload to Supabase storage
      const fileName = `episode-thumb-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);

      setEpisodeForm({ ...episodeForm, thumbnail: publicUrlData.publicUrl });

      toast({
        title: 'Sucesso!',
        description: 'Thumbnail gerada automaticamente.',
      });
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar a thumbnail. Verifique se o vídeo permite acesso.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const openEditEpisodeDialog = (episode: Episode) => {
    setEditingEpisode(episode);
    setEpisodeForm({
      season: episode.season.toString(),
      episode: episode.episode.toString(),
      title: episode.title || '',
      description: episode.description || '',
      video_url: episode.video_url || '',
      thumbnail: episode.thumbnail || '',
      duration: episode.duration || '',
      intro_start: episode.intro_start?.toString() || '',
      intro_end: episode.intro_end?.toString() || '',
    });
    setEpisodeDialogOpen(true);
  };

  const handleSaveEpisode = async () => {
    if (!episodeForm.video_url) {
      toast({
        title: 'Erro',
        description: 'O vídeo é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    const episodeData = {
      series_id: id,
      season: parseInt(episodeForm.season),
      episode: parseInt(episodeForm.episode),
      title: episodeForm.title || null,
      description: episodeForm.description || null,
      video_url: episodeForm.video_url,
      thumbnail: episodeForm.thumbnail || null,
      duration: episodeForm.duration || null,
      intro_start: episodeForm.intro_start ? parseInt(episodeForm.intro_start) : null,
      intro_end: episodeForm.intro_end ? parseInt(episodeForm.intro_end) : null,
    };

    let error;
    if (editingEpisode) {
      // Update existing episode
      const result = await supabase
        .from('episodes')
        .update(episodeData)
        .eq('id', editingEpisode.id);
      error = result.error;
    } else {
      // Insert new episode
      const result = await supabase.from('episodes').insert(episodeData);
      error = result.error;
    }

    if (error) {
      toast({
        title: 'Erro',
        description: editingEpisode 
          ? 'Não foi possível atualizar o episódio.' 
          : 'Não foi possível adicionar o episódio.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso!',
        description: editingEpisode ? 'Episódio atualizado.' : 'Episódio adicionado.',
      });
      setEpisodeDialogOpen(false);
      resetEpisodeForm();
      fetchEpisodes();
    }
  };

  const handleDeleteEpisode = async () => {
    if (deletePassword !== DELETE_PASSWORD) {
      toast({
        title: 'Senha incorreta',
        description: 'A senha de exclusão está incorreta.',
        variant: 'destructive',
      });
      return;
    }

    if (!deleteEpisodeId) return;

    const { error } = await supabase.from('episodes').delete().eq('id', deleteEpisodeId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o episódio.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Episódio excluído.',
      });
      fetchEpisodes();
    }

    setDeleteEpisodeId(null);
    setDeletePassword('');
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/series')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Tv className="w-8 h-8 text-primary" />
            Editar Série
          </h1>
          <p className="text-muted-foreground">
            Atualize os dados da série
          </p>
        </div>
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
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                      <SelectValue />
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
                <Label htmlFor="year">Ano</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.release_year}
                  onChange={(e) => setFormData({ ...formData, release_year: e.target.value })}
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

            {/* Episodes Section */}
            <div className="p-6 bg-card rounded-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold">Episódios ({episodes.length})</h3>
                <Dialog open={episodeDialogOpen} onOpenChange={(open) => {
                  setEpisodeDialogOpen(open);
                  if (!open) resetEpisodeForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2" onClick={() => resetEpisodeForm()}>
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingEpisode ? 'Editar Episódio' : 'Adicionar Episódio'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Temporada</Label>
                          <Input
                            type="number"
                            min="1"
                            value={episodeForm.season}
                            onChange={(e) => setEpisodeForm({ ...episodeForm, season: e.target.value })}
                            className="bg-secondary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Episódio</Label>
                          <Input
                            type="number"
                            min="1"
                            value={episodeForm.episode}
                            onChange={(e) => setEpisodeForm({ ...episodeForm, episode: e.target.value })}
                            className="bg-secondary/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={episodeForm.title}
                          onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                          placeholder="Nome do episódio"
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duração</Label>
                        <Input
                          value={episodeForm.duration}
                          onChange={(e) => setEpisodeForm({ ...episodeForm, duration: e.target.value })}
                          placeholder="Ex: 45min"
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Abertura - Início (segundos)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={episodeForm.intro_start}
                            onChange={(e) => setEpisodeForm({ ...episodeForm, intro_start: e.target.value })}
                            placeholder="Ex: 5"
                            className="bg-secondary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Abertura - Fim (segundos)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={episodeForm.intro_end}
                            onChange={(e) => setEpisodeForm({ ...episodeForm, intro_end: e.target.value })}
                            placeholder="Ex: 90"
                            className="bg-secondary/50"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Defina o tempo em segundos para o botão "Pular Abertura" aparecer
                      </p>
                      <div className="space-y-3">
                        <Label>Thumbnail do Episódio</Label>
                        
                        {/* Auto-generate from video */}
                        <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            Gerar automaticamente do vídeo
                          </p>
                          <div className="flex gap-2">
                            <Input
                              value={thumbnailTime}
                              onChange={(e) => setThumbnailTime(e.target.value)}
                              placeholder="Tempo (ex: 1:30 ou 90)"
                              className="bg-secondary/50 flex-1"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={handleGenerateThumbnail}
                              disabled={isGeneratingThumbnail || !episodeForm.video_url}
                            >
                              {isGeneratingThumbnail ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Gerando...
                                </>
                              ) : (
                                'Capturar'
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Informe o minuto:segundo da cena desejada
                          </p>
                        </div>

                        {/* Preview */}
                        {episodeForm.thumbnail && (
                          <div className="relative">
                            <img
                              src={episodeForm.thumbnail}
                              alt="Thumbnail preview"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => setEpisodeForm({ ...episodeForm, thumbnail: '' })}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {/* Manual upload option */}
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Ou faça upload manual:</p>
                          <ThumbnailUpload
                            onUploadComplete={(url) => setEpisodeForm({ ...episodeForm, thumbnail: url })}
                            currentUrl=""
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Vídeo {!editingEpisode && '*'}</Label>
                        <VideoUpload
                          onUploadComplete={(url) => setEpisodeForm({ ...episodeForm, video_url: url })}
                        />
                        {editingEpisode && episodeForm.video_url && (
                          <p className="text-xs text-muted-foreground">
                            Vídeo atual configurado. Faça upload para substituir.
                          </p>
                        )}
                      </div>
                      <Button onClick={handleSaveEpisode} className="w-full">
                        {editingEpisode ? 'Salvar Alterações' : 'Adicionar Episódio'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {episodes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Nenhum episódio adicionado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
                    >
                      <div className="w-20 h-12 rounded overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
                        {ep.thumbnail ? (
                          <img
                            src={ep.thumbnail}
                            alt={ep.title || `Episódio ${ep.episode}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          T{ep.season}E{ep.episode}: {ep.title || `Episódio ${ep.episode}`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {ep.duration && <span>{ep.duration}</span>}
                          {ep.intro_start != null && ep.intro_end != null && (
                            <span className="text-primary">• Abertura: {ep.intro_start}s - {ep.intro_end}s</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                        onClick={() => openEditEpisodeDialog(ep)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteEpisodeId(ep.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="p-6 bg-card rounded-2xl border border-border">
              <h3 className="font-display font-bold mb-4">Thumbnail</h3>
              <ThumbnailUpload
                onUploadComplete={(url) => setFormData({ ...formData, thumbnail: url })}
                currentUrl={formData.thumbnail}
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Episode Dialog */}
      <AlertDialog open={!!deleteEpisodeId} onOpenChange={() => setDeleteEpisodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir Episódio
            </AlertDialogTitle>
            <AlertDialogDescription>
              Digite a senha de exclusão para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Senha de exclusão"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="bg-secondary/50"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePassword('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEpisode}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditSeries;
