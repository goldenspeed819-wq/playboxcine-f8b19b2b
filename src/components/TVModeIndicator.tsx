import { Tv, Smartphone } from 'lucide-react';
import { useTVMode } from '@/contexts/TVModeContext';
import { Switch } from '@/components/ui/switch';

export function TVModeIndicator() {
  const { isTVMode, setTVMode } = useTVMode();

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-secondary/90 backdrop-blur-md rounded-full px-4 py-3 shadow-lg border border-border/50">
        <Smartphone className={`w-4 h-4 ${!isTVMode ? 'text-primary' : 'text-muted-foreground'}`} />
        <Switch
          checked={isTVMode}
          onCheckedChange={setTVMode}
          className="data-[state=checked]:bg-primary"
        />
        <Tv className={`w-4 h-4 ${isTVMode ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>

      {/* TV Mode Active Indicator */}
      {isTVMode && (
        <div className="fixed top-20 left-4 z-50 bg-primary/20 border border-primary/50 rounded-lg px-3 py-2 backdrop-blur-sm">
          <p className="text-xs text-primary flex items-center gap-2">
            <Tv className="w-3 h-3" />
            Modo TV - Use setas para navegar
          </p>
        </div>
      )}
    </>
  );
}
