import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, Play, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoPlayer } from '@/components/VideoPlayer';
import { CommentSection } from '@/components/CommentSection';
import { PageLoader } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Series, Episode } from '@/types/database';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const SeriesDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      fetchSeriesAndEpisodes();
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchWatchedEpisodes();
    }
  }, [user, episodes]);

  const fetchSeriesAndEpisodes = async () => {
    const [seriesRes, episodesRes] = await Promise.all([
      supabase.from('series').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('episodes')
        .select('*')
        .eq('series_id', id)
        .order('season', { ascending: true })
        .order('episode', { ascending: true }),
    ]);

    if (seriesRes.error) {
      console.error('Error fetching series:', seriesRes.error);
    } else {
      setSeries(seriesRes.data);
    }

    if (episodesRes.error) {
      console.error('Error fetching episodes:', episodesRes.error);
    } else {
      setEpisodes(episodesRes.data || []);
      if (episodesRes.data && episodesRes.data.length > 0) {
        setSelectedEpisode(episodesRes.data[0]);
      }
    }

    setIsLoading(false);
  };

  const fetchWatchedEpisodes = async () => {
    if (!user || episodes.length === 0) return;
    
    const episodeIds = episodes.map(e => e.id);
    const { data, error } = await supabase
      .from('watched_episodes')
      .select('episode_id')
      .eq('user_id', user.id)
      .in('episode_id', episodeIds);

    if (error) {
      console.error('Error fetching watched episodes:', error);
      return;
    }

    setWatchedEpisodes(new Set(data?.map(w => w.episode_id) || []));
  };

  const markAsWatched = async (episodeId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('watched_episodes')
      .upsert({
        user_id: user.id,
        episode_id: episodeId,
        completed: true,
      }, { onConflict: 'user_id,episode_id' });

    if (error) {
      console.error('Error marking episode as watched:', error);
      return;
    }

    setWatchedEpisodes(prev => new Set([...prev, episodeId]));
  };

  const toggleWatched = async (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    if (watchedEpisodes.has(episodeId)) {
      // Remove from watched
      const { error } = await supabase
        .from('watched_episodes')
        .delete()
        .eq('user_id', user.id)
        .eq('episode_id', episodeId);

      if (!error) {
        setWatchedEpisodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(episodeId);
          return newSet;
        });
      }
    } else {
      // Mark as watched
      await markAsWatched(episodeId);
    }
  };

  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode);
    // Mark as watched when starting to play
    if (user && !watchedEpisodes.has(episode.id)) {
      markAsWatched(episode.id);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 text-center">
          <h1 className="font-display text-2xl text-muted-foreground">
            Série não encontrada
          </h1>
          <Button asChild className="mt-4">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const seasons = [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b);
  const seasonEpisodes = episodes.filter((e) => e.season === selectedSeason);
  const watchedInSeason = seasonEpisodes.filter(e => watchedEpisodes.has(e.id)).length;

  // Get next episode
  const getNextEpisode = () => {
    if (!selectedEpisode) return null;
    const currentIndex = episodes.findIndex((e) => e.id === selectedEpisode.id);
    if (currentIndex === -1 || currentIndex === episodes.length - 1) return null;
    return episodes[currentIndex + 1];
  };

  const nextEpisode = getNextEpisode();

  const handleNextEpisode = () => {
    if (nextEpisode) {
      handleEpisodeSelect(nextEpisode);
      setSelectedSeason(nextEpisode.season);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Background */}
      <div className="relative h-[50vh] overflow-hidden">
        {series.thumbnail ? (
          <img
            src={series.thumbnail}
            alt={series.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-hero-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <main className="relative z-10 -mt-40 pb-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button
            asChild
            variant="ghost"
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <Link to="/series">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Video Player */}
              <VideoPlayer
                src={selectedEpisode?.video_url || null}
                poster={selectedEpisode?.thumbnail || series.thumbnail}
                title={
                  selectedEpisode
                    ? `${series.title} - T${selectedEpisode.season}E${selectedEpisode.episode}`
                    : series.title
                }
                nextLabel={nextEpisode ? `Próximo: T${nextEpisode.season}E${nextEpisode.episode}` : undefined}
                onNextClick={nextEpisode ? handleNextEpisode : undefined}
                introStartTime={selectedEpisode?.intro_start}
                introEndTime={selectedEpisode?.intro_end}
              />

              {/* Series Info */}
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                  {series.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  {series.release_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {series.release_year}
                    </span>
                  )}
                  {series.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      {series.category}
                    </span>
                  )}
                  {series.rating && (
                    <span className="px-2 py-0.5 border border-muted-foreground/50 rounded text-xs">
                      {series.rating}
                    </span>
                  )}
                  <span>{episodes.length} episódios</span>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {series.description || 'Sem descrição disponível.'}
                </p>
              </div>

              {/* Episodes List */}
              {episodes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-bold flex items-center gap-2">
                      <span className="w-1 h-5 bg-primary rounded-full" />
                      Episódios
                    </h2>
                    {user && (
                      <span className="text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 inline mr-1 text-green-500" />
                        {watchedInSeason}/{seasonEpisodes.length} assistidos
                      </span>
                    )}
                  </div>

                  {/* Season Tabs */}
                  {seasons.length > 1 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {seasons.map((season) => {
                        const seasonEps = episodes.filter(e => e.season === season);
                        const watchedCount = seasonEps.filter(e => watchedEpisodes.has(e.id)).length;
                        return (
                          <button
                            key={season}
                            onClick={() => setSelectedSeason(season)}
                            className={cn(
                              'px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors relative',
                              selectedSeason === season
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            )}
                          >
                            Temporada {season}
                            {user && watchedCount > 0 && (
                              <span className={cn(
                                'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                                selectedSeason === season
                                  ? 'bg-primary-foreground/20'
                                  : 'bg-green-500/20 text-green-500'
                              )}>
                                {watchedCount}/{seasonEps.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Episodes */}
                  <div className="space-y-2">
                    {seasonEpisodes.map((episode) => {
                      const isWatched = watchedEpisodes.has(episode.id);
                      return (
                        <button
                          key={episode.id}
                          onClick={() => handleEpisodeSelect(episode)}
                          className={cn(
                            'w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4',
                            selectedEpisode?.id === episode.id
                              ? 'bg-primary/10 border-primary'
                              : 'bg-card border-border hover:border-primary/50',
                            isWatched && 'opacity-80'
                          )}
                        >
                          {/* Thumbnail with play overlay */}
                          <div className="w-28 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0 relative group/thumb">
                            {episode.thumbnail ? (
                              <img
                                src={episode.thumbnail}
                                alt={episode.title || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-muted to-secondary" />
                            )}
                            {/* Watched overlay */}
                            {isWatched && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              </div>
                            )}
                            {/* Play overlay */}
                            {!isWatched && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center">
                                  <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                                </div>
                              </div>
                            )}
                            {/* Episode number badge */}
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                              {episode.episode}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                              Ep. {episode.episode}: {episode.title || `Episódio ${episode.episode}`}
                              {isWatched && (
                                <span className="text-xs text-green-500 font-normal">Assistido</span>
                              )}
                            </h4>
                            {episode.duration && (
                              <p className="text-xs text-muted-foreground">
                                {episode.duration}
                              </p>
                            )}
                          </div>

                          {/* Watched Toggle / Play Icon */}
                          {user && (
                            <button
                              onClick={(e) => toggleWatched(episode.id, e)}
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                                isWatched 
                                  ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' 
                                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                              )}
                              title={isWatched ? 'Marcar como não assistido' : 'Marcar como assistido'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Play Icon */}
                          {selectedEpisode?.id === episode.id && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <Play className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comments */}
              {selectedEpisode && <CommentSection episodeId={selectedEpisode.id} />}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Poster */}
              {series.thumbnail && (
                <div className="aspect-[2/3] rounded-xl overflow-hidden border border-border">
                  <img
                    src={series.thumbnail}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Info Card */}
              <div className="p-6 bg-card rounded-xl border border-border">
                <h3 className="font-display font-bold mb-4">Informações</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Título</dt>
                    <dd className="font-semibold">{series.title}</dd>
                  </div>
                  {series.release_year && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Ano</dt>
                      <dd>{series.release_year}</dd>
                    </div>
                  )}
                  {series.category && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Gênero</dt>
                      <dd>{series.category}</dd>
                    </div>
                  )}
                  {series.rating && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Classificação</dt>
                      <dd>{series.rating}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Temporadas</dt>
                    <dd>{seasons.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Episódios</dt>
                    <dd>{episodes.length}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SeriesDetail;
