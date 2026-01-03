import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Film, Tv } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WatchProgress {
  id: string;
  title: string;
  thumbnail: string | null;
  type: 'movie' | 'series';
  progressSeconds: number;
  contentId: string;
  episodeInfo?: string;
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

export const ContinueWatchingRow = () => {
  const { user } = useAuth();
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWatchProgress();
    }
  }, [user]);

  const fetchWatchProgress = async () => {
    if (!user) return;

    try {
      // Fetch movies in progress (not completed, with progress > 30s)
      const { data: moviesData } = await supabase
        .from('watched_movies')
        .select(`
          id,
          progress_seconds,
          movie_id,
          completed,
          movies (
            id,
            title,
            thumbnail
          )
        `)
        .eq('user_id', user.id)
        .eq('completed', false)
        .gt('progress_seconds', 30)
        .order('watched_at', { ascending: false })
        .limit(10);

      // Fetch episodes in progress (not completed, with progress > 30s)
      const { data: episodesData } = await supabase
        .from('watched_episodes')
        .select(`
          id,
          progress_seconds,
          episode_id,
          completed,
          episodes (
            id,
            title,
            thumbnail,
            season,
            episode,
            series_id,
            series (
              id,
              title,
              thumbnail
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('completed', false)
        .gt('progress_seconds', 30)
        .order('watched_at', { ascending: false })
        .limit(10);

      const progress: WatchProgress[] = [];

      // Add movies
      moviesData?.forEach((item: any) => {
        if (item.movies) {
          progress.push({
            id: item.id,
            title: item.movies.title,
            thumbnail: item.movies.thumbnail,
            type: 'movie',
            progressSeconds: item.progress_seconds,
            contentId: item.movies.id,
          });
        }
      });

      // Add episodes
      episodesData?.forEach((item: any) => {
        if (item.episodes?.series) {
          progress.push({
            id: item.id,
            title: item.episodes.series.title,
            thumbnail: item.episodes.thumbnail || item.episodes.series.thumbnail,
            type: 'series',
            progressSeconds: item.progress_seconds,
            contentId: item.episodes.series.id,
            episodeInfo: `T${item.episodes.season}E${item.episodes.episode}`,
          });
        }
      });

      setWatchProgress(progress);
    } catch (error) {
      console.error('Error fetching watch progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || watchProgress.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="font-display text-2xl font-bold">Continue Assistindo</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {watchProgress.map((item) => (
            <Link
              key={item.id}
              to={item.type === 'movie' ? `/movie/${item.contentId}` : `/series/${item.contentId}`}
              className="group relative"
            >
              <div className="aspect-video rounded-xl overflow-hidden bg-secondary relative">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
                    {item.type === 'movie' ? (
                      <Film className="w-10 h-10 text-muted-foreground" />
                    ) : (
                      <Tv className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min((item.progressSeconds / 5400) * 100, 95)}%` }}
                  />
                </div>

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </div>
                </div>

                {/* Type badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-xs font-medium">
                  {item.type === 'movie' ? 'Filme' : item.episodeInfo}
                </div>
              </div>

              <div className="mt-2">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatTime(item.progressSeconds)} assistido
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
