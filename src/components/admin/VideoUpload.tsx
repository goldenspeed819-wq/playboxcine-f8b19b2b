import { useState, useRef } from 'react';
import { Upload, X, FileVideo, CheckCircle, Pause, Play, Link, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useVideoConverter } from '@/hooks/useVideoConverter';
import * as tus from 'tus-js-client';

interface VideoUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string | null;
}

export function VideoUpload({ onUploadComplete, currentUrl }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl || null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const lastProgressRef = useRef<{ time: number; bytes: number }>({ time: 0, bytes: 0 });
  const speedHistoryRef = useRef<number[]>([]);
  
  const { convertToMp4, needsConversion, conversionProgress, resetProgress } = useVideoConverter();

  // Check if current URL is external
  const isExternalUrl = (url: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('vimeo.com') || 
           url.includes('drive.google.com') ||
           url.includes('dropbox.com') ||
           url.includes('mega.nz') ||
           (!url.includes('supabase') && url.startsWith('http'));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type - accept more formats for conversion
    const validTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/avi', 'video/mp2t'];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['mp4', 'webm', 'mkv', 'ts', 'mts', 'avi'];
    
    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(extension || '')) {
      toast({
        title: 'Formato inválido',
        description: 'Use arquivos MP4, WEBM, MKV, TS ou AVI.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    // Don't create preview for large files to save memory
    if (selectedFile.size < 100 * 1024 * 1024) {
      setPreview(URL.createObjectURL(selectedFile));
    } else {
      setPreview(null);
    }
    setUploadedUrl(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    let fileToUpload = file;
    
    // Check if conversion is needed
    if (needsConversion(file)) {
      setIsConverting(true);
      try {
        toast({
          title: 'Convertendo vídeo',
          description: 'Convertendo para MP4 para compatibilidade com navegadores...',
        });
        fileToUpload = await convertToMp4(file);
        setFile(fileToUpload);
        toast({
          title: 'Conversão concluída!',
          description: 'Iniciando upload...',
        });
      } catch (error) {
        toast({
          title: 'Erro na conversão',
          description: 'Não foi possível converter o vídeo. Tente um arquivo MP4.',
          variant: 'destructive',
        });
        setIsConverting(false);
        resetProgress();
        return;
      }
      setIsConverting(false);
      resetProgress();
    }

    setIsUploading(true);
    setProgress(0);
    setUploadSpeed('');
    setTimeRemaining('');
    lastProgressRef.current = { time: Date.now(), bytes: 0 };
    speedHistoryRef.current = [];

    const fileName = `${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const upload = new tus.Upload(fileToUpload, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 10 * 1024 * 1024, // 10MB chunks for faster upload
      headers: {
        authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'videos',
        objectName: fileName,
        contentType: fileToUpload.type || 'video/mp4',
        cacheControl: '31536000',
      },
      onError: (error) => {
        console.error('Upload error:', error);
        toast({
          title: 'Erro no upload',
          description: error.message || 'Não foi possível enviar o vídeo.',
          variant: 'destructive',
        });
        setIsUploading(false);
        setIsPaused(false);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100);
        setProgress(percent);

        // Calculate upload speed and ETA
        const now = Date.now();
        const timeDiff = (now - lastProgressRef.current.time) / 1000;
        if (timeDiff >= 0.5) {
          const bytesDiff = bytesUploaded - lastProgressRef.current.bytes;
          const speed = bytesDiff / timeDiff;
          
          // Keep last 5 speed samples for smoothing
          speedHistoryRef.current.push(speed);
          if (speedHistoryRef.current.length > 5) {
            speedHistoryRef.current.shift();
          }
          
          const avgSpeed = speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length;
          setUploadSpeed(formatSpeed(avgSpeed));
          
          // Calculate remaining time
          const bytesRemaining = bytesTotal - bytesUploaded;
          if (avgSpeed > 0) {
            const secondsRemaining = bytesRemaining / avgSpeed;
            setTimeRemaining(formatTimeRemaining(secondsRemaining));
          }
          
          lastProgressRef.current = { time: now, bytes: bytesUploaded };
        }
      },
      onSuccess: () => {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${fileName}`;
        setProgress(100);
        setUploadedUrl(publicUrl);
        onUploadComplete(publicUrl);
        setIsUploading(false);
        setIsPaused(false);
        uploadRef.current = null;
        toast({
          title: 'Upload concluído!',
          description: 'O vídeo foi enviado com sucesso.',
        });
      },
    });

    uploadRef.current = upload;

    // Check for previous uploads to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  };

  const handlePauseResume = () => {
    if (!uploadRef.current) return;

    if (isPaused) {
      uploadRef.current.start();
      setIsPaused(false);
    } else {
      uploadRef.current.abort();
      setIsPaused(true);
    }
  };

  const handleCancel = () => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
    }
    setIsUploading(false);
    setIsPaused(false);
    setProgress(0);
    setUploadSpeed('');
  };

  const handleClear = () => {
    handleCancel();
    setFile(null);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleExternalUrlSubmit = () => {
    if (!externalUrl.trim()) {
      toast({
        title: 'URL inválida',
        description: 'Por favor, insira uma URL válida.',
        variant: 'destructive',
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(externalUrl);
    } catch {
      toast({
        title: 'URL inválida',
        description: 'Por favor, insira uma URL válida.',
        variant: 'destructive',
      });
      return;
    }

    setUploadedUrl(externalUrl);
    onUploadComplete(externalUrl);
    toast({
      title: 'URL salva!',
      description: 'A URL do vídeo foi salva com sucesso.',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s restantes`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min restantes`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}min restantes`;
  };

  // If already has URL, show success state
  if (uploadedUrl) {
    return (
      <div className="p-4 bg-card rounded-xl border border-green-500/50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            {isExternalUrl(uploadedUrl) ? (
              <ExternalLink className="w-5 h-5 text-green-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-green-500">
              {isExternalUrl(uploadedUrl) ? 'URL externa salva!' : 'Upload concluído!'}
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
              {uploadedUrl}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setUploadedUrl(null);
            setFile(null);
            setPreview(null);
            setExternalUrl('');
          }}
        >
          Substituir vídeo
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload
        </TabsTrigger>
        <TabsTrigger value="url" className="gap-2">
          <Link className="w-4 h-4" />
          URL Externa
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-4 mt-4">
        {/* File Input Area */}
        {!file && (
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
                MP4, WEBM, MKV, TS ou AVI (conversão automática)
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="video/mp4,video/webm,video/x-matroska,video/mp2t,video/avi,.mkv,.ts,.mts,.avi"
              onChange={handleFileSelect}
            />
          </label>
        )}

        {/* File Preview */}
        {file && (
          <div className="p-4 bg-card rounded-xl border border-border space-y-4">
            {/* Preview Video - only for small files */}
            {preview && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <video
                  src={preview}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Large file indicator */}
            {!preview && file && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <div className="text-center">
                  <FileVideo className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Arquivo grande - preview desativado</p>
                </div>
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
                disabled={isUploading && !isPaused}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Conversion Warning */}
            {needsConversion(file) && !isConverting && !isUploading && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Este arquivo será convertido para MP4 antes do upload para garantir compatibilidade com navegadores.
                </p>
              </div>
            )}

            {/* Conversion Progress */}
            {isConverting && conversionProgress && (
              <div className="space-y-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm font-medium text-primary">
                    {conversionProgress.message}
                  </span>
                </div>
                <Progress value={conversionProgress.progress} className="h-2" />
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && !isConverting && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{isPaused ? 'Pausado' : 'Enviando...'} {progress}%</span>
                  <div className="flex gap-3">
                    {timeRemaining && <span>{timeRemaining}</span>}
                    {uploadSpeed && <span className="text-primary">{uploadSpeed}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isUploading && !isConverting ? (
              <Button onClick={handleUpload} className="w-full gap-2">
                <Upload className="w-4 h-4" />
                {needsConversion(file) ? 'Converter e Enviar' : 'Confirmar Upload'}
              </Button>
            ) : isConverting ? (
              <Button disabled className="w-full gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Convertendo...
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePauseResume}
                  className="flex-1 gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Pausar
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  className="flex-1 gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="url" className="space-y-4 mt-4">
        <div className="p-4 bg-card rounded-xl border border-border space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">URL Externa</p>
              <p className="text-xs text-muted-foreground">
                YouTube, Vimeo, Google Drive, etc.
              </p>
            </div>
          </div>

          <Input
            placeholder="https://youtube.com/watch?v=... ou link direto"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
          />

          <p className="text-xs text-muted-foreground">
            Cole a URL do vídeo de qualquer serviço de streaming ou hospedagem.
            Ideal para vídeos muito grandes.
          </p>

          <Button 
            onClick={handleExternalUrlSubmit} 
            className="w-full gap-2"
            disabled={!externalUrl.trim()}
          >
            <Link className="w-4 h-4" />
            Salvar URL
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
