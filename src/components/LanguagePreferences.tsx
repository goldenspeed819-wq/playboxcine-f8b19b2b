import { useState, useEffect } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const LANGUAGES = [
  'Português',
  'English',
  'Español',
  'Français',
  'Deutsch',
  'Italiano',
  'Japonês',
  'Coreano',
  'Chinês',
];

interface LanguagePreferencesProps {
  variant?: 'button' | 'inline';
}

export function LanguagePreferences({ variant = 'button' }: LanguagePreferencesProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [audioLanguage, setAudioLanguage] = useState('Português');
  const [subtitleLanguage, setSubtitleLanguage] = useState('Português');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('preferred_audio_language, preferred_subtitle_language')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setAudioLanguage(data.preferred_audio_language || 'Português');
      setSubtitleLanguage(data.preferred_subtitle_language || 'Português');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          preferred_audio_language: audioLanguage,
          preferred_subtitle_language: subtitleLanguage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;

      toast({
        title: 'Preferências salvas',
        description: 'Suas preferências de idioma foram atualizadas.',
      });

      setOpen(false);
    } catch (error) {
      console.error('Error saving language preferences:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as preferências.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Idioma de áudio preferido</Label>
        <Select value={audioLanguage} onValueChange={setAudioLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Quando disponível, o áudio será reproduzido neste idioma
        </p>
      </div>

      <div className="space-y-2">
        <Label>Idioma de legenda preferido</Label>
        <Select value={subtitleLanguage} onValueChange={setSubtitleLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Quando disponíveis, as legendas serão exibidas neste idioma
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            Preferências de Idioma
          </DialogTitle>
          <DialogDescription>
            Configure seus idiomas preferidos para áudio e legendas.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
