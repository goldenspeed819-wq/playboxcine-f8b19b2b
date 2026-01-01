import { useState, useEffect } from 'react';
import { X, Sparkles, Film, Tv } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface UpdateNotificationProps {
  userId: string | undefined;
}

export const UpdateNotification = ({ userId }: UpdateNotificationProps) => {
  const [show, setShow] = useState(false);
  const [counts, setCounts] = useState({ movies: 0, series: 0 });

  useEffect(() => {
    if (!userId) return;
    
    const checkForUpdates = async () => {
      // Check if already shown today
      const lastShown = localStorage.getItem('update_notification_shown');
      const today = new Date().toISOString().split('T')[0];
      
      if (lastShown === today) return;
      
      // Get today's start time
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Count movies and series added today
      const [moviesRes, seriesRes] = await Promise.all([
        supabase
          .from('movies')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString()),
        supabase
          .from('series')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString())
      ]);
      
      const totalToday = (moviesRes.count || 0) + (seriesRes.count || 0);
      
      if (totalToday >= 5) {
        setCounts({
          movies: moviesRes.count || 0,
          series: seriesRes.count || 0
        });
        setShow(true);
      }
    };
    
    checkForUpdates();
  }, [userId]);

  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('update_notification_shown', today);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-br from-card via-card to-primary/10 border border-primary/30 rounded-2xl p-6 shadow-2xl">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl -z-10" />
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
        
        {/* Content */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse-slow">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Novidades no ar! 🎉
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Adicionamos novos conteúdos para você assistir
          </p>
          
          <div className="flex justify-center gap-6 mb-6">
            {counts.movies > 0 && (
              <div className="flex items-center gap-2 bg-orange-500/20 px-4 py-2 rounded-xl">
                <Film className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-orange-400">{counts.movies}</span>
                <span className="text-sm text-orange-300">
                  {counts.movies === 1 ? 'Filme' : 'Filmes'}
                </span>
              </div>
            )}
            
            {counts.series > 0 && (
              <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-xl">
                <Tv className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-blue-400">{counts.series}</span>
                <span className="text-sm text-blue-300">
                  {counts.series === 1 ? 'Série' : 'Séries'}
                </span>
              </div>
            )}
          </div>
          
          <Button onClick={handleClose} className="w-full neon-glow">
            Explorar Novidades
          </Button>
        </div>
      </div>
    </div>
  );
};
