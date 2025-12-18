import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, Link, Trash2, Save, Image } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const SiteSettings = () => {
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: bgData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'background_image')
        .maybeSingle();

      const { data: opacityData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'background_opacity')
        .maybeSingle();

      if (bgData?.value) {
        setBackgroundUrl(bgData.value);
        setPreviewUrl(bgData.value);
      }

      if (opacityData?.value) {
        setBackgroundOpacity(parseFloat(opacityData.value));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    setIsSaving(true);
    try {
      // Upsert background_image
      const { error: bgError } = await supabase
        .from('site_settings')
        .upsert({ key: 'background_image', value: backgroundUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (bgError) throw bgError;

      // Upsert background_opacity
      const { error: opacityError } = await supabase
        .from('site_settings')
        .upsert({ key: 'background_opacity', value: backgroundOpacity.toString(), updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (opacityError) throw opacityError;

      setPreviewUrl(backgroundUrl);
      toast({
        title: 'Configurações salvas',
        description: 'A imagem de fundo foi atualizada com sucesso.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `background-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);

      setBackgroundUrl(urlData.publicUrl);
      setPreviewUrl(urlData.publicUrl);

      toast({
        title: 'Upload concluído',
        description: 'Imagem enviada com sucesso. Clique em salvar para aplicar.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveBackground = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'background_image', value: null, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      setBackgroundUrl('');
      setPreviewUrl('');
      toast({
        title: 'Fundo removido',
        description: 'A imagem de fundo foi removida.',
      });
    } catch (error) {
      console.error('Error removing background:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o fundo.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Site</h1>
        <p className="text-muted-foreground">Personalize a aparência do site</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Imagem de Fundo</CardTitle>
              <CardDescription>
                Adicione uma imagem de fundo semi-transparente ao site
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden border border-border/50">
              <div 
                className="h-40 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${previewUrl})`,
                  opacity: backgroundOpacity 
                }}
              />
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Preview (opacidade: {Math.round(backgroundOpacity * 100)}%)
                </p>
              </div>
            </div>
          )}

          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-2">
                <Link className="w-4 h-4" />
                Por URL
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="bg-url">URL da imagem</Label>
                <Input
                  id="bg-url"
                  value={backgroundUrl}
                  onChange={(e) => setBackgroundUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="bg-secondary/50"
                />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Enviar imagem</Label>
                <div className="flex items-center gap-4">
                  <label className="flex-1">
                    <div className="flex items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-muted-foreground">Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Clique para selecionar uma imagem
                          </span>
                          <span className="text-xs text-muted-foreground/70">
                            PNG, JPG ou WEBP (máx. 5MB)
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Opacity Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Opacidade do fundo</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(backgroundOpacity * 100)}%
              </span>
            </div>
            <Slider
              value={[backgroundOpacity]}
              onValueChange={([value]) => setBackgroundOpacity(value)}
              min={0.05}
              max={0.5}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Valores mais baixos deixam a imagem mais sutil
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-border/50">
            <Button onClick={handleSaveUrl} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
            {previewUrl && (
              <Button variant="destructive" onClick={handleRemoveBackground} disabled={isSaving}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remover fundo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettings;
