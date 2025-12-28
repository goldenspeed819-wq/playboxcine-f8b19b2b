import { useState, useRef } from 'react';
import { Upload, FileText, X, Edit2, Check, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubtitleUploadProps {
  movieId?: string;
  episodeId?: string;
  existingSubtitles?: Array<{
    id: string;
    language: string;
    subtitle_url: string;
  }>;
  onSubtitleChange?: () => void;
}

const languages = [
  'Português',
  'Português (BR)',
  'English',
  'Español',
  'Français',
  'Deutsch',
  'Italiano',
  'Japanese',
  'Korean',
  'Chinese',
];

// Convert SRT to VTT format
const convertSrtToVtt = (srtContent: string): string => {
  // Add WEBVTT header and convert SRT time format to VTT
  let vttContent = 'WEBVTT\n\n';
  
  // Replace commas with periods in timestamps (SRT uses commas, VTT uses periods)
  const converted = srtContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .split('\n\n')
    .filter(block => block.trim())
    .map(block => {
      const lines = block.split('\n');
      // Remove the sequence number (first line if it's just a number)
      if (/^\d+$/.test(lines[0].trim())) {
        lines.shift();
      }
      return lines.join('\n');
    })
    .join('\n\n');
  
  return vttContent + converted;
};

export function SubtitleUpload({ movieId, episodeId, existingSubtitles = [], onSubtitleChange }: SubtitleUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Português');
  const [showEditor, setShowEditor] = useState(false);
  const [subtitleContent, setSubtitleContent] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.srt', '.vtt', '.ass', '.sub'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      toast({
        title: 'Formato inválido',
        description: 'Use arquivos SRT, VTT, ASS ou SUB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSubtitleContent(content);
      setOriginalFileName(file.name);
      setShowEditor(true);
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveSubtitle = async () => {
    if (!subtitleContent.trim()) {
      toast({
        title: 'Erro',
        description: 'O conteúdo da legenda está vazio.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to VTT if it's not already
      let vttContent = subtitleContent;
      if (!subtitleContent.trim().startsWith('WEBVTT')) {
        vttContent = convertSrtToVtt(subtitleContent);
      }

      // Create blob and upload to storage
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const fileName = `${Date.now()}_${selectedLanguage.replace(/[^a-zA-Z]/g, '')}.vtt`;
      const filePath = movieId 
        ? `movies/${movieId}/${fileName}`
        : `episodes/${episodeId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('subtitles')
        .upload(filePath, blob, { contentType: 'text/vtt' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('subtitles')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase.from('subtitles').insert({
        movie_id: movieId || null,
        episode_id: episodeId || null,
        language: selectedLanguage,
        subtitle_url: publicUrl,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Sucesso!',
        description: 'Legenda adicionada com sucesso.',
      });

      setShowEditor(false);
      setSubtitleContent('');
      onSubtitleChange?.();
    } catch (error) {
      console.error('Error uploading subtitle:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a legenda.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSubtitle = async (subtitleId: string, subtitleUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = subtitleUrl.split('/subtitles/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('subtitles').remove([filePath]);
      }

      const { error } = await supabase
        .from('subtitles')
        .delete()
        .eq('id', subtitleId);

      if (error) throw error;

      toast({
        title: 'Legenda removida',
        description: 'A legenda foi removida com sucesso.',
      });

      onSubtitleChange?.();
    } catch (error) {
      console.error('Error deleting subtitle:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a legenda.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Languages className="w-4 h-4 text-primary" />
        <Label className="font-semibold">Legendas</Label>
      </div>

      {/* Existing Subtitles */}
      {existingSubtitles.length > 0 && (
        <div className="space-y-2">
          {existingSubtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{subtitle.language}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteSubtitle(subtitle.id, subtitle.subtitle_url)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-40 bg-secondary/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          Adicionar Legenda
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt,.ass,.sub"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Formatos suportados: SRT, VTT, ASS, SUB. Arquivos SRT serão convertidos automaticamente.
      </p>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Editar Legenda - {selectedLanguage}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <p className="text-sm text-muted-foreground mb-2">
              Arquivo: {originalFileName}
            </p>
            <Textarea
              value={subtitleContent}
              onChange={(e) => setSubtitleContent(e.target.value)}
              className="h-[400px] font-mono text-sm bg-secondary/50 resize-none"
              placeholder="Conteúdo da legenda..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSubtitle} disabled={isUploading} className="gap-2">
              <Check className="w-4 h-4" />
              {isUploading ? 'Salvando...' : 'Salvar Legenda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
