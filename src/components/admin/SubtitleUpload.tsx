import { useState, useRef } from 'react';
import { Upload, FileText, X, Edit2, Check, Languages, Download, Eye, Clock, Search, Replace, Trash2, Copy } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  let vttContent = 'WEBVTT\n\n';
  
  const converted = srtContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .split('\n\n')
    .filter(block => block.trim())
    .map(block => {
      const lines = block.split('\n');
      if (/^\d+$/.test(lines[0].trim())) {
        lines.shift();
      }
      return lines.join('\n');
    })
    .join('\n\n');
  
  return vttContent + converted;
};

// Convert VTT to SRT format
const convertVttToSrt = (vttContent: string): string => {
  let content = vttContent
    .replace(/^WEBVTT\n+/, '')
    .replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1,$2')
    .trim();
  
  const blocks = content.split('\n\n').filter(block => block.trim());
  let srtContent = '';
  
  blocks.forEach((block, index) => {
    srtContent += `${index + 1}\n${block}\n\n`;
  });
  
  return srtContent.trim();
};

// Adjust timing for all subtitles
const adjustTiming = (content: string, offsetSeconds: number): string => {
  const adjustTime = (timeStr: string) => {
    const separator = timeStr.includes(',') ? ',' : '.';
    const parts = timeStr.split(separator);
    const [h, m, s] = parts[0].split(':').map(Number);
    const ms = parseInt(parts[1]);
    
    let totalMs = (h * 3600 + m * 60 + s) * 1000 + ms + (offsetSeconds * 1000);
    if (totalMs < 0) totalMs = 0;
    
    const newH = Math.floor(totalMs / 3600000);
    const newM = Math.floor((totalMs % 3600000) / 60000);
    const newS = Math.floor((totalMs % 60000) / 1000);
    const newMs = totalMs % 1000;
    
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}${separator}${String(newMs).padStart(3, '0')}`;
  };
  
  return content.replace(/(\d{2}:\d{2}:\d{2}[,.]\d{3})/g, adjustTime);
};

export function SubtitleUpload({ movieId, episodeId, existingSubtitles = [], onSubtitleChange }: SubtitleUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Português');
  const [showEditor, setShowEditor] = useState(false);
  const [subtitleContent, setSubtitleContent] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [editingSubtitle, setEditingSubtitle] = useState<{id: string; language: string; url: string} | null>(null);
  
  // Editor tools state
  const [timingOffset, setTimingOffset] = useState('0');
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [activeTab, setActiveTab] = useState('edit');

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
      setEditingSubtitle(null);
      setShowEditor(true);
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditExistingSubtitle = async (subtitle: {id: string; language: string; subtitle_url: string}) => {
    try {
      const response = await fetch(subtitle.subtitle_url);
      const content = await response.text();
      setSubtitleContent(content);
      setOriginalFileName(`${subtitle.language}.vtt`);
      setSelectedLanguage(subtitle.language);
      setEditingSubtitle({id: subtitle.id, language: subtitle.language, url: subtitle.subtitle_url});
      setShowEditor(true);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a legenda para edição.',
        variant: 'destructive',
      });
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

      // If editing existing, delete old file first
      if (editingSubtitle) {
        const urlParts = editingSubtitle.url.split('/subtitles/');
        if (urlParts.length > 1) {
          await supabase.storage.from('subtitles').remove([urlParts[1]]);
        }
        await supabase.from('subtitles').delete().eq('id', editingSubtitle.id);
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
        description: editingSubtitle ? 'Legenda atualizada com sucesso.' : 'Legenda adicionada com sucesso.',
      });

      setShowEditor(false);
      setSubtitleContent('');
      setEditingSubtitle(null);
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

  // Editor tools
  const handleAdjustTiming = () => {
    const offset = parseFloat(timingOffset);
    if (isNaN(offset)) {
      toast({ title: 'Erro', description: 'Valor de tempo inválido.', variant: 'destructive' });
      return;
    }
    setSubtitleContent(adjustTiming(subtitleContent, offset));
    toast({ title: 'Sucesso!', description: `Tempo ajustado em ${offset}s` });
  };

  const handleSearchReplace = () => {
    if (!searchText) {
      toast({ title: 'Erro', description: 'Digite o texto para buscar.', variant: 'destructive' });
      return;
    }
    const count = (subtitleContent.match(new RegExp(searchText, 'g')) || []).length;
    const newContent = subtitleContent.split(searchText).join(replaceText);
    setSubtitleContent(newContent);
    toast({ title: 'Sucesso!', description: `${count} ocorrência(s) substituída(s).` });
  };

  const handleConvertToVtt = () => {
    if (!subtitleContent.trim().startsWith('WEBVTT')) {
      setSubtitleContent(convertSrtToVtt(subtitleContent));
      toast({ title: 'Convertido para VTT' });
    } else {
      toast({ title: 'Já está em formato VTT' });
    }
  };

  const handleConvertToSrt = () => {
    if (subtitleContent.trim().startsWith('WEBVTT')) {
      setSubtitleContent(convertVttToSrt(subtitleContent));
      toast({ title: 'Convertido para SRT' });
    } else {
      toast({ title: 'Já está em formato SRT' });
    }
  };

  const handleRemoveFormatting = () => {
    // Remove HTML tags and styling
    const cleaned = subtitleContent
      .replace(/<[^>]*>/g, '')
      .replace(/\{[^}]*\}/g, '');
    setSubtitleContent(cleaned);
    toast({ title: 'Formatação removida' });
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(subtitleContent);
    toast({ title: 'Copiado para a área de transferência' });
  };

  const handleDownloadSubtitle = async (url: string, language: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${language}.vtt`;
      a.click();
    } catch (error) {
      toast({ title: 'Erro ao baixar', variant: 'destructive' });
    }
  };

  const handlePreviewSubtitle = (url: string) => {
    window.open(url, '_blank');
  };

  const countSubtitleLines = () => {
    const blocks = subtitleContent.split('\n\n').filter(b => b.trim());
    return blocks.length;
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
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      Opções
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditExistingSubtitle(subtitle)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePreviewSubtitle(subtitle.subtitle_url)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadSubtitle(subtitle.subtitle_url, subtitle.language)}>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteSubtitle(subtitle.id, subtitle.subtitle_url)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {editingSubtitle ? 'Editar' : 'Nova'} Legenda - {selectedLanguage}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="edit">Editor</TabsTrigger>
              <TabsTrigger value="tools">Ferramentas</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 overflow-hidden mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Arquivo: {originalFileName} • {countSubtitleLines()} legendas
                </p>
                <Button variant="ghost" size="sm" onClick={handleCopyContent}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
              </div>
              <Textarea
                value={subtitleContent}
                onChange={(e) => setSubtitleContent(e.target.value)}
                className="h-[400px] font-mono text-sm bg-secondary/50 resize-none"
                placeholder="Conteúdo da legenda..."
              />
            </TabsContent>

            <TabsContent value="tools" className="space-y-6 mt-4 overflow-y-auto max-h-[450px]">
              {/* Timing Adjustment */}
              <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <Label className="font-medium">Ajustar Sincronização</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adianta ou atrasa todas as legendas (em segundos). Use valores negativos para adiantar.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={timingOffset}
                    onChange={(e) => setTimingOffset(e.target.value)}
                    placeholder="Ex: 2.5 ou -1"
                    className="bg-secondary/50 w-32"
                  />
                  <Button variant="secondary" onClick={handleAdjustTiming}>
                    Aplicar
                  </Button>
                </div>
              </div>

              {/* Search & Replace */}
              <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  <Label className="font-medium">Buscar e Substituir</Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar..."
                    className="bg-secondary/50"
                  />
                  <Input
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Substituir por..."
                    className="bg-secondary/50"
                  />
                </div>
                <Button variant="secondary" onClick={handleSearchReplace} className="gap-2">
                  <Replace className="w-4 h-4" />
                  Substituir Tudo
                </Button>
              </div>

              {/* Format Conversion */}
              <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                <Label className="font-medium">Conversão de Formato</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleConvertToVtt}>
                    Converter para VTT
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleConvertToSrt}>
                    Converter para SRT
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRemoveFormatting}>
                    Remover Formatação HTML
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setShowEditor(false);
              setEditingSubtitle(null);
            }}>
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
