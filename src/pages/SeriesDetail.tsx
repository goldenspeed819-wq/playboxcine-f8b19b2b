import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, Play } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoPlayer } from '@/components/VideoPlayer';
import { CommentSection } from '@/components/CommentSection';
import { PageLoader } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Series, Episode } from '@/types/database';
import { cn } from '@/lib/utils';

const SeriesDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSeriesAndEpisodes();
    }
  }, [id]);

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
                  <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Episódios
                  </h2>

                  {/* Season Tabs */}
                  {seasons.length > 1 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {seasons.map((season) => (
                        <button
                          key={season}
                          onClick={() => setSelectedSeason(season)}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors',
                            selectedSeason === season
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                          )}
                        >
                          Temporada {season}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Episodes */}
                  <div className="space-y-2">
                    {seasonEpisodes.map((episode) => (
                      <button
                        key={episode.id}
                        onClick={() => setSelectedEpisode(episode)}
                        className={cn(
                          'w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4',
                          selectedEpisode?.id === episode.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="w-24 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          {episode.thumbnail ? (
                            <img
                              src={episode.thumbnail}
                              alt={episode.title || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">
                            Ep. {episode.episode}: {episode.title || `Episódio ${episode.episode}`}
                          </h4>
                          {episode.duration && (
                            <p className="text-xs text-muted-foreground">
                              {episode.duration}
                            </p>
                          )}
                        </div>

                        {/* Play Icon */}
                        {selectedEpisode?.id === episode.id && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <Play className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
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
