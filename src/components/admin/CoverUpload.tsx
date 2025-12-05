import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CoverUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string | null;
}

export function CoverUpload({ onUploadComplete, currentUrl }: CoverUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Use arquivos JPG, PNG ou WEBP.',
        variant: 'destructive',
      });
      return;
    }

    setPreview(URL.createObjectURL(selectedFile));
    setIsUploading(true);

    try {
      const fileName = `covers/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, selectedFile, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(data.path);

      setPreview(urlData.publicUrl);
      onUploadComplete(urlData.publicUrl);

      toast({
        title: 'Capa enviada!',
        description: 'A imagem de capa foi enviada com sucesso.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    onUploadComplete('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <label
          className={cn(
            'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            'border-border hover:border-primary hover:bg-primary/5',
            isUploading && 'pointer-events-none opacity-50'
          )}
        >
          <div className="flex flex-col items-center justify-center py-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground mb-1">
              {isUploading ? 'Enviando...' : 'Selecionar capa'}
            </p>
            <p className="text-xs text-muted-foreground">
              Imagem widescreen (16:9)
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      ) : (
        <div className="relative">
          <div className="aspect-video rounded-xl overflow-hidden border border-border">
            <img
              src={preview}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 w-8 h-8"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
