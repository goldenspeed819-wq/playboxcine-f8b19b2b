import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';

interface ContinueWatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progressSeconds: number;
  onContinue: () => void;
  onRestart: () => void;
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export function ContinueWatchingDialog({
  open,
  onOpenChange,
  progressSeconds,
  onContinue,
  onRestart,
}: ContinueWatchingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Continuar Assistindo?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Você parou em <span className="text-primary font-semibold">{formatTime(progressSeconds)}</span>. 
            Deseja continuar de onde parou?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onRestart}
            className="gap-2 flex-1"
          >
            <RotateCcw className="w-4 h-4" />
            Começar do início
          </Button>
          <Button
            onClick={onContinue}
            className="gap-2 flex-1"
          >
            <Play className="w-4 h-4" />
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
