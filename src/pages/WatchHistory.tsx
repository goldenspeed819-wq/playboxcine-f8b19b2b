import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { History, Film, Tv, Trash2, Play, Clock, Calendar, X, CheckCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/LoadingSpinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WatchedMovie {
  id: string;
  movie_id: string;
  progress_seconds: number;
  completed: boolean;
  watched_at: string;
  movies: {
    id: string;
    title: string;
    thumbnail: string | null;
    duration: string | null;
  };
}

interface WatchedEpisode {
  id: string;
  episode_id: string;
  progress_seconds: number;
  completed: boolean;
  watched_at: string;
  episodes: {
    id: string;
    title: string | null;
    thumbnail: string | null;
    season: number;
    episode: number;
    series_id: string;
    series: {
      id: string;
      title: string;
      thumbnail: string | null;
    };
  };
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

const WatchHistory = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'movie' | 'episode'; id: string } | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const [moviesRes, episodesRes] = await Promise.all([
        supabase
          .from('watched_movies')
          .select(`
            id,
            movie_id,
            progress_seconds,
            completed,
            watched_at,
            movies (
              id,
              title,
              thumbnail,
              duration
            )
          `)
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false }),
        supabase
          .from('watched_episodes')
          .select(`
            id,
            episode_id,
            progress_seconds,
            completed,
            watched_at,
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
          .order('watched_at', { ascending: false }),
      ]);

      if (moviesRes.data) {
        setWatchedMovies(moviesRes.data as any);
      }
      if (episodesRes.data) {
        setWatchedEpisodes(episodesRes.data as any);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'movie') {
        await supabase.from('watched_movies').delete().eq('id', itemToDelete.id);
        setWatchedMovies((prev) => prev.filter((m) => m.id !== itemToDelete.id));
      } else {
        await supabase.from('watched_episodes').delete().eq('id', itemToDelete.id);
        setWatchedEpisodes((prev) => prev.filter((e) => e.id !== itemToDelete.id));
      }

      toast({
        title: 'Removido do histórico',
        description: 'O item foi removido do seu histórico.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o item.',
        variant: 'destructive',
      });
    }

    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleClearAll = async () => {
    if (!user) return;

    try {
      await Promise.all([
        supabase.from('watched_movies').delete().eq('user_id', user.id),
        supabase.from('watched_episodes').delete().eq('user_id', user.id),
      ]);

      setWatchedMovies([]);
      setWatchedEpisodes([]);

      toast({
        title: 'Histórico limpo',
        description: 'Todo o seu histórico foi removido.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível limpar o histórico.',
        variant: 'destructive',
      });
    }

    setClearAllDialogOpen(false);
  };

  const openDeleteDialog = (type: 'movie' | 'episode', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  if (authLoading || isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const totalItems = watchedMovies.length + watchedEpisodes.length;
  const completedMovies = watchedMovies.filter((m) => m.completed).length;
  const completedEpisodes = watchedEpisodes.filter((e) => e.completed).length;

  // Combine and sort all items by date
  const allItems = [
    ...watchedMovies.map((m) => ({ ...m, type: 'movie' as const })),
    ...watchedEpisodes.map((e) => ({ ...e, type: 'episode' as const })),
  ].sort((a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime());

  const filteredItems =
    activeTab === 'all'
      ? allItems
      : activeTab === 'movies'
      ? allItems.filter((i) => i.type === 'movie')
      : allItems.filter((i) => i.type === 'episode');

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <History className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold">Histórico</h1>
                  <p className="text-muted-foreground">Seu histórico de visualizações</p>
                </div>
              </div>

              {totalItems > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setClearAllDialogOpen(true)}
                  className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Histórico
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground text-sm">Filmes</p>
                <p className="text-2xl font-bold">{watchedMovies.length}</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground text-sm">Episódios</p>
                <p className="text-2xl font-bold">{watchedEpisodes.length}</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground text-sm">Completos</p>
                <p className="text-2xl font-bold">{completedMovies + completedEpisodes}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg w-fit">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'movies', label: 'Filmes' },
                { key: 'series', label: 'Séries' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-semibold transition-all',
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <History className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhum item no histórico</h2>
              <p className="text-muted-foreground mb-6">
                Comece a assistir filmes e séries para ver seu histórico aqui.
              </p>
              <Button asChild>
                <Link to="/browse">Explorar Conteúdo</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isMovie = item.type === 'movie';
                const movieData = isMovie ? (item as WatchedMovie) : null;
                const episodeData = !isMovie ? (item as WatchedEpisode) : null;

                const title = isMovie
                  ? movieData!.movies?.title
                  : episodeData!.episodes?.series?.title;
                const thumbnail = isMovie
                  ? movieData!.movies?.thumbnail
                  : episodeData!.episodes?.thumbnail || episodeData!.episodes?.series?.thumbnail;
                const contentId = isMovie
                  ? movieData!.movies?.id
                  : episodeData!.episodes?.series?.id;
                const subtitle = isMovie
                  ? null
                  : `T${episodeData!.episodes?.season}E${episodeData!.episodes?.episode}${
                      episodeData!.episodes?.title ? ` - ${episodeData!.episodes?.title}` : ''
                    }`;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all group"
                  >
                    {/* Thumbnail */}
                    <Link
                      to={isMovie ? `/movie/${contentId}` : `/series/${contentId}`}
                      className="relative w-28 md:w-36 aspect-video rounded-lg overflow-hidden bg-secondary flex-shrink-0"
                    >
                      {thumbnail ? (
                        <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isMovie ? (
                            <Film className="w-8 h-8 text-muted-foreground" />
                          ) : (
                            <Tv className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                      )}

                      {/* Progress bar */}
                      {!item.completed && item.progress_seconds > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min((item.progress_seconds / 5400) * 100, 95)}%` }}
                          />
                        </div>
                      )}

                      {/* Completed badge */}
                      {item.completed && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                      )}

                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isMovie ? (
                          <Film className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        ) : (
                          <Tv className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground uppercase">
                          {isMovie ? 'Filme' : 'Série'}
                        </span>
                        {item.completed && (
                          <span className="text-xs text-green-500 font-medium">• Completo</span>
                        )}
                      </div>

                      <Link
                        to={isMovie ? `/movie/${contentId}` : `/series/${contentId}`}
                        className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
                      >
                        {title}
                      </Link>

                      {subtitle && <p className="text-sm text-muted-foreground line-clamp-1">{subtitle}</p>}

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {!item.completed && item.progress_seconds > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.progress_seconds)} assistido
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.watched_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" className="hidden md:flex">
                        <Link to={isMovie ? `/movie/${contentId}` : `/series/${contentId}`}>
                          <Play className="w-4 h-4 mr-2" />
                          {item.completed ? 'Reassistir' : 'Continuar'}
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(isMovie ? 'movie' : 'episode', item.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Este item será removido do seu histórico. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens do seu histórico serão removidos permanentemente. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WatchHistory;
