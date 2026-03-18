import { useState, useEffect, useCallback } from 'react';
import { Play, X, SkipForward, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Episode } from '@/types/database';

interface AutoplayOverlayProps {
  nextEpisode: Episode | null;
  seriesTitle: string;
  onPlayNext: () => void;
  onCancel: () => void;
  visible: boolean;
}

export function AutoplayOverlay({ nextEpisode, seriesTitle, onPlayNext, onCancel, visible }: AutoplayOverlayProps) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!visible || !nextEpisode) return;
    setCountdown(10);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onPlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, nextEpisode, onPlayNext]);

  if (!visible || !nextEpisode) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-in fade-in duration-300">
      <div className="max-w-lg w-full mx-4 space-y-6 text-center">
        <p className="text-sm text-muted-foreground">Próximo episódio em</p>
        
        {/* Countdown circle */}
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - countdown / 10)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-primary">
            {countdown}
          </span>
        </div>

        {/* Next episode info */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{seriesTitle}</p>
          <h3 className="text-xl font-bold">
            T{String(nextEpisode.season).padStart(2, '0')}E{String(nextEpisode.episode).padStart(2, '0')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {nextEpisode.title || `Episódio ${nextEpisode.episode}`}
          </p>
          {nextEpisode.thumbnail && (
            <img
              src={nextEpisode.thumbnail}
              alt=""
              className="w-full max-w-xs mx-auto rounded-lg border border-border aspect-video object-cover"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button onClick={onPlayNext} className="gap-2">
            <Play className="w-4 h-4" />
            Reproduzir agora
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EpisodePanelProps {
  episodes: Episode[];
  currentEpisodeId: string | null;
  seriesTitle: string;
  watchedEpisodes: Set<string>;
  seasons: number[];
  onSelectEpisode: (episode: Episode) => void;
  onClose: () => void;
  visible: boolean;
}

export function EpisodePanel({
  episodes, currentEpisodeId, seriesTitle, watchedEpisodes,
  seasons, onSelectEpisode, onClose, visible,
}: EpisodePanelProps) {
  const [selectedSeason, setSelectedSeason] = useState(1);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F1' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  // Set selected season to match current episode
  useEffect(() => {
    if (visible && currentEpisodeId) {
      const ep = episodes.find(e => e.id === currentEpisodeId);
      if (ep) setSelectedSeason(ep.season);
    }
  }, [visible, currentEpisodeId, episodes]);

  if (!visible) return null;

  const seasonEpisodes = episodes.filter(e => e.season === selectedSeason);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex animate-in slide-in-from-right duration-300">
      <div className="flex-1" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg">{seriesTitle}</h2>
            <p className="text-xs text-muted-foreground">Pressione F1 para fechar</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Season tabs */}
        {seasons.length > 1 && (
          <div className="flex gap-1 p-3 overflow-x-auto border-b border-border/50">
            {seasons.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSeason(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                  selectedSeason === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                T{s}
              </button>
            ))}
          </div>
        )}

        {/* Episodes */}
        <div className="divide-y divide-border/30">
          {seasonEpisodes.map(ep => {
            const isCurrent = ep.id === currentEpisodeId;
            const isWatched = watchedEpisodes.has(ep.id);

            return (
              <button
                key={ep.id}
                onClick={() => { onSelectEpisode(ep); onClose(); }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors',
                  isCurrent && 'bg-primary/10 border-l-2 border-primary'
                )}
              >
                <div className="w-20 h-12 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                  {ep.thumbnail ? (
                    <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-secondary" />
                  )}
                  {isCurrent && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 text-[10px] bg-black/70 text-white px-1 rounded">
                    {ep.episode}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', isCurrent && 'text-primary')}>
                    Ep. {ep.episode}: {ep.title || `Episódio ${ep.episode}`}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {ep.duration && <span>{ep.duration}</span>}
                    {isWatched && <span className="text-green-500">✓ Assistido</span>}
                  </div>
                </div>
                {isCurrent && (
                  <SkipForward className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
