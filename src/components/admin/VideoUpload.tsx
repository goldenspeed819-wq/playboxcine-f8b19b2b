import { useState, useRef } from 'react';
import { Upload, X, Play, FileVideo, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VideoUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string | null;
}

export function VideoUpload({ onUploadComplete, currentUrl }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/x-matroska'];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Use arquivos MP4, WEBM ou MKV.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setUploadedUrl(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(10);

    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      setProgress(30);

      const { data, error } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      setProgress(90);

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      setProgress(100);
      setUploadedUrl(urlData.publicUrl);
      onUploadComplete(urlData.publicUrl);

      toast({
        title: 'Upload concluído!',
        description: 'O vídeo foi enviado com sucesso.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar o vídeo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* File Input Area */}
      {!file && !uploadedUrl && (
        <label
          className={cn(
            'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            'border-border hover:border-primary hover:bg-primary/5'
          )}
        >
          <div className="flex flex-col items-center justify-center py-6">
            <Upload className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">
              Clique para selecionar um vídeo
            </p>
            <p className="text-xs text-muted-foreground">
              MP4, WEBM ou MKV (máx. 100GB)
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="video/mp4,video/webm,video/x-matroska"
            onChange={handleFileSelect}
          />
        </label>
      )}

      {/* File Preview */}
      {file && !uploadedUrl && (
        <div className="p-4 bg-card rounded-xl border border-border space-y-4">
          {/* Preview Video */}
          {preview && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={preview}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* File Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileVideo className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm truncate max-w-[200px]">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Enviando... {progress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          {!isUploading && (
            <Button onClick={handleUpload} className="w-full gap-2">
              <Upload className="w-4 h-4" />
              Confirmar Upload
            </Button>
          )}
        </div>
      )}

      {/* Uploaded Success */}
      {uploadedUrl && (
        <div className="p-4 bg-card rounded-xl border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-green-500">Upload concluído!</p>
              <p className="text-xs text-muted-foreground truncate">
                {uploadedUrl}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <video
              src={uploadedUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>

          {/* Replace Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setUploadedUrl(null);
              setFile(null);
              setPreview(null);
            }}
          >
            Substituir vídeo
          </Button>
        </div>
      )}
    </div>
  );
}
