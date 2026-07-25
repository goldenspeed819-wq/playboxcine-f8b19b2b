import { useState } from 'react';
import { Smartphone, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useOptionalRemoteControl } from '@/contexts/RemoteControlContext';

export function RemoteControlDialog() {
  const remote = useOptionalRemoteControl();
  const [copied, setCopied] = useState(false);

  if (!remote) return null;

  const remoteUrl = `${window.location.origin}/remote?code=${remote.code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(remoteUrl)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(remoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary h-8 w-8 rounded-lg"
          title="Controle remoto"
        >
          <Smartphone className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Controle remoto pelo celular</DialogTitle>
          <DialogDescription>
            Abra o link no celular (ou escaneie o QR) e digite o código para controlar este PC.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <img
              src={qrUrl}
              alt="QR code para abrir o controle remoto"
              className="w-40 h-40 rounded-xl bg-white p-2"
              onError={(e) => ((e.currentTarget.style.display = 'none'))}
            />
            <p className="font-display text-4xl tracking-[0.35em] text-primary">{remote.code}</p>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
              {remoteUrl}
            </code>
            <Button variant="secondary" size="icon" onClick={copy} title="Copiar link">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Aceitar comandos</Label>
              <p className="text-xs text-muted-foreground">
                {remote.enabled
                  ? remote.isHostConnected
                    ? 'Ouvindo o controle remoto'
                    : 'Conectando...'
                  : 'Desativado'}
              </p>
            </div>
            <Switch checked={remote.enabled} onCheckedChange={remote.setEnabled} />
          </div>

          <Button variant="outline" className="w-full" onClick={remote.regenerateCode}>
            <RefreshCw className="w-4 h-4 mr-2" /> Gerar novo código
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}