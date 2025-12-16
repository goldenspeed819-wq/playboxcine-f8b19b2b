import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Radio, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LiveChannel {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  iframe_url: string;
  category: string | null;
  is_featured: boolean | null;
  is_live: boolean | null;
  created_at: string;
}

const ManageLiveChannels = () => {
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<LiveChannel | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    iframe_url: '',
    category: '',
    is_featured: false,
    is_live: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchChannels = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('live_channels')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setChannels(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      thumbnail: '',
      iframe_url: '',
      category: '',
      is_featured: false,
      is_live: true
    });
    setEditingChannel(null);
  };

  const openEditDialog = (channel: LiveChannel) => {
    setEditingChannel(channel);
    setFormData({
      title: channel.title,
      description: channel.description || '',
      thumbnail: channel.thumbnail || '',
      iframe_url: channel.iframe_url,
      category: channel.category || '',
      is_featured: channel.is_featured || false,
      is_live: channel.is_live ?? true
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.iframe_url.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o título e a URL do iframe.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingChannel) {
        const { error } = await supabase
          .from('live_channels')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            thumbnail: formData.thumbnail.trim() || null,
            iframe_url: formData.iframe_url.trim(),
            category: formData.category.trim() || null,
            is_featured: formData.is_featured,
            is_live: formData.is_live
          })
          .eq('id', editingChannel.id);

        if (error) throw error;

        toast({
          title: 'Canal atualizado!',
          description: 'O canal foi atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('live_channels')
          .insert({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            thumbnail: formData.thumbnail.trim() || null,
            iframe_url: formData.iframe_url.trim(),
            category: formData.category.trim() || null,
            is_featured: formData.is_featured,
            is_live: formData.is_live
          });

        if (error) throw error;

        toast({
          title: 'Canal adicionado!',
          description: 'O canal ao vivo foi adicionado com sucesso.',
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar canal.',
        variant: 'destructive'
      });
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal?')) return;

    try {
      const { error } = await supabase.from('live_channels').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Canal excluído!',
        description: 'O canal foi removido com sucesso.',
      });

      setChannels(channels.filter(c => c.id !== id));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir canal.',
        variant: 'destructive'
      });
    }
  };

  const toggleLive = async (channel: LiveChannel) => {
    try {
      const { error } = await supabase
        .from('live_channels')
        .update({ is_live: !channel.is_live })
        .eq('id', channel.id);

      if (error) throw error;

      setChannels(channels.map(c => 
        c.id === channel.id ? { ...c, is_live: !c.is_live } : c
      ));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Canais ao Vivo</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie canais de transmissão ao vivo via iframe.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Canal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? 'Editar Canal' : 'Adicionar Canal ao Vivo'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Nome do canal"
                    className="bg-secondary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Esportes, Notícias..."
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL do Iframe *</Label>
                <Textarea
                  value={formData.iframe_url}
                  onChange={(e) => setFormData({ ...formData, iframe_url: e.target.value })}
                  placeholder="Cole o código do iframe ou a URL do player"
                  className="bg-secondary/50 min-h-[100px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o iframe completo ou apenas a URL src do player
                </p>
              </div>

              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  placeholder="https://exemplo.com/thumb.jpg"
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do canal"
                  className="bg-secondary/50"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_live}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_live: checked })}
                  />
                  <Label>Ao Vivo</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label>Destaque</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Salvando...' : editingChannel ? 'Salvar Alterações' : 'Adicionar Canal'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Channels Grid */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-display text-xl font-bold mb-4">
          Canais Cadastrados ({channels.length})
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : channels.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum canal cadastrado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(channel => (
              <div key={channel.id} className="bg-secondary/30 rounded-lg overflow-hidden border border-border">
                <div className="aspect-video bg-secondary relative">
                  {channel.thumbnail ? (
                    <img
                      src={channel.thumbnail}
                      alt={channel.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Radio className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Live indicator */}
                  {channel.is_live && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 rounded text-xs font-bold flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      AO VIVO
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold truncate">{channel.title}</h3>
                  {channel.category && (
                    <p className="text-xs text-muted-foreground mt-1">{channel.category}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(channel)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleLive(channel)}
                    >
                      {channel.is_live ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(channel.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageLiveChannels;
