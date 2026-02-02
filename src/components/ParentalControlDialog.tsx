import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Shield, Lock } from 'lucide-react';

interface ParentalControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RATINGS = ['Livre', '10+', '12+', '14+', '16+', '18+'];

export function ParentalControlDialog({
  open,
  onOpenChange,
}: ParentalControlDialogProps) {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [maxRating, setMaxRating] = useState('18+');
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadPreferences();
    }
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('parental_control_enabled, parental_control_pin, parental_control_max_rating')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setIsEnabled(data.parental_control_enabled || false);
      setMaxRating(data.parental_control_max_rating || '18+');
      setHasExistingPin(!!data.parental_control_pin);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate PIN if enabling
    if (isEnabled && !hasExistingPin) {
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        toast({
          title: 'PIN inválido',
          description: 'O PIN deve ter exatamente 4 dígitos numéricos.',
          variant: 'destructive',
        });
        return;
      }

      if (pin !== confirmPin) {
        toast({
          title: 'PINs não coincidem',
          description: 'Por favor, verifique o PIN de confirmação.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          parental_control_enabled: isEnabled,
          parental_control_max_rating: maxRating,
          parental_control_pin: pin && !hasExistingPin ? pin : undefined,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'Controle parental atualizado com sucesso.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving parental control:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          parental_control_pin: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setHasExistingPin(false);
      setPin('');
      setConfirmPin('');

      toast({
        title: 'PIN removido',
        description: 'Você pode definir um novo PIN agora.',
      });
    } catch (error) {
      console.error('Error resetting PIN:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o PIN.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Controle Parental
          </DialogTitle>
          <DialogDescription>
            Configure restrições de conteúdo baseadas na classificação indicativa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar controle parental</Label>
              <p className="text-sm text-muted-foreground">
                Bloqueia conteúdo acima da classificação selecionada
              </p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {isEnabled && (
            <>
              {/* Max Rating */}
              <div className="space-y-2">
                <Label>Classificação máxima permitida</Label>
                <Select value={maxRating} onValueChange={setMaxRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATINGS.map((rating) => (
                      <SelectItem key={rating} value={rating}>
                        {rating}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Conteúdo acima de "{maxRating}" será bloqueado
                </p>
              </div>

              {/* PIN Setup */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="w-4 h-4" />
                  PIN de Segurança
                </div>

                {hasExistingPin ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Um PIN já está configurado. Ele será necessário para desbloquear conteúdo restrito.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetPin}
                      disabled={isLoading}
                    >
                      Redefinir PIN
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="pin">Criar PIN (4 dígitos)</Label>
                      <Input
                        id="pin"
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-xl tracking-widest"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pin">Confirmar PIN</Label>
                      <Input
                        id="confirm-pin"
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-xl tracking-widest"
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
