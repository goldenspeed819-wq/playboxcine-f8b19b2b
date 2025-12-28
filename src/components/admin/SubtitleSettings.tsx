import { useState, useEffect } from 'react';
import { Save, Type, Palette, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SubtitleStyles {
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  fontWeight: string;
  textShadow: boolean;
}

const defaultStyles: SubtitleStyles = {
  fontSize: 20,
  fontColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.75,
  fontWeight: 'normal',
  textShadow: true,
};

const fontColors = [
  { label: 'Branco', value: '#ffffff' },
  { label: 'Amarelo', value: '#ffff00' },
  { label: 'Ciano', value: '#00ffff' },
  { label: 'Verde', value: '#00ff00' },
  { label: 'Rosa', value: '#ff69b4' },
];

const bgColors = [
  { label: 'Preto', value: '#000000' },
  { label: 'Cinza Escuro', value: '#333333' },
  { label: 'Azul Escuro', value: '#000033' },
  { label: 'Vermelho Escuro', value: '#330000' },
  { label: 'Transparente', value: 'transparent' },
];

export function SubtitleSettings() {
  const [styles, setStyles] = useState<SubtitleStyles>(defaultStyles);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'subtitle_styles')
        .maybeSingle();

      if (data?.value) {
        setStyles(JSON.parse(data.value));
      }
    } catch (error) {
      console.error('Error fetching subtitle settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { 
            key: 'subtitle_styles', 
            value: JSON.stringify(styles), 
            updated_at: new Date().toISOString() 
          }, 
          { onConflict: 'key' }
        );

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de legenda foram atualizadas.',
      });
    } catch (error) {
      console.error('Error saving subtitle settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStyles(defaultStyles);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Type className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Configurações de Legenda</CardTitle>
            <CardDescription>
              Personalize a aparência das legendas nos vídeos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 h-32 flex items-end justify-center pb-4">
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="text-6xl">🎬</div>
          </div>
          <div
            className="px-3 py-1 rounded transition-all"
            style={{
              fontSize: `${styles.fontSize}px`,
              color: styles.fontColor,
              backgroundColor: styles.backgroundColor === 'transparent' 
                ? 'transparent' 
                : `${styles.backgroundColor}${Math.round(styles.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
              fontWeight: styles.fontWeight === 'bold' ? 700 : 400,
              textShadow: styles.textShadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
            }}
          >
            Exemplo de legenda
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Tamanho da fonte
            </Label>
            <span className="text-sm text-muted-foreground font-mono">
              {styles.fontSize}px
            </span>
          </div>
          <Slider
            value={[styles.fontSize]}
            onValueChange={([value]) => setStyles({ ...styles, fontSize: value })}
            min={14}
            max={32}
            step={1}
            className="w-full"
          />
        </div>

        {/* Font Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Cor do texto
          </Label>
          <div className="flex gap-2 flex-wrap">
            {fontColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setStyles({ ...styles, fontColor: color.value })}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  styles.fontColor === color.value
                    ? 'border-primary scale-110'
                    : 'border-border/50 hover:border-primary/50'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Square className="w-4 h-4" />
            Cor de fundo
          </Label>
          <div className="flex gap-2 flex-wrap">
            {bgColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setStyles({ ...styles, backgroundColor: color.value })}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  styles.backgroundColor === color.value
                    ? 'border-primary scale-110'
                    : 'border-border/50 hover:border-primary/50'
                } ${color.value === 'transparent' ? 'bg-[repeating-linear-gradient(45deg,#333,#333_5px,#444_5px,#444_10px)]' : ''}`}
                style={{ backgroundColor: color.value !== 'transparent' ? color.value : undefined }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Background Opacity */}
        {styles.backgroundColor !== 'transparent' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Opacidade do fundo</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(styles.backgroundOpacity * 100)}%
              </span>
            </div>
            <Slider
              value={[styles.backgroundOpacity]}
              onValueChange={([value]) => setStyles({ ...styles, backgroundOpacity: value })}
              min={0.25}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>
        )}

        {/* Font Weight */}
        <div className="space-y-2">
          <Label>Peso da fonte</Label>
          <Select
            value={styles.fontWeight}
            onValueChange={(value) => setStyles({ ...styles, fontWeight: value })}
          >
            <SelectTrigger className="w-full bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Negrito</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Text Shadow Toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <Label>Sombra do texto</Label>
            <p className="text-xs text-muted-foreground">
              Adiciona sombra para melhor legibilidade
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStyles({ ...styles, textShadow: !styles.textShadow })}
            className={`w-12 h-6 rounded-full transition-colors ${
              styles.textShadow ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                styles.textShadow ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Restaurar Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
