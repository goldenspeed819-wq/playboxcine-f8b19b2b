import { useState, useRef } from 'react';
import { Upload, X, FileVideo, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
    setProgress(0);

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${fileName}`;
        setProgress(100);
        setUploadedUrl(publicUrl);
        onUploadComplete(publicUrl);
        toast({
          title: 'Upload concluído!',
          description: 'O vídeo foi enviado com sucesso.',
        });
      } else {
        const errorData = JSON.parse(xhr.responseText);
        toast({
          title: 'Erro no upload',
          description: errorData.message || 'Não foi possível enviar o vídeo.',
          variant: 'destructive',
        });
      }
      setIsUploading(false);
    };

    xhr.onerror = () => {
      toast({
        title: 'Erro no upload',
        description: 'Falha na conexão. Tente novamente.',
        variant: 'destructive',
      });
      setIsUploading(false);
    };

    xhr.open('POST', `${supabaseUrl}/storage/v1/object/videos/${fileName}`);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
    xhr.setRequestHeader('apikey', supabaseKey);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.send(file);
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
