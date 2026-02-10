import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoPlayer } from '@/components/VideoPlayer';
import IframePlayer from '@/components/IframePlayer';
import { CommentSection } from '@/components/CommentSection';
import { ChatangoWidget } from '@/components/ChatangoWidget';
import { PageLoader } from '@/components/LoadingSpinner';
import { ContinueWatchingDialog } from '@/components/ContinueWatchingDialog';
import { FavoriteButton } from '@/components/FavoriteButton';
import { RatingStars } from '@/components/RatingStars';
import { ShareButtons } from '@/components/ShareButtons';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Movie } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { getSourceType } from '@/utils/videoSource';

interface SubtitleTrack {
  id: string;
  language: string;
  subtitle_url: string;
}

const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [movie, setMovie] = useState<Movie & { video_url_part2?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState<1 | 2>(1);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [savedProgress, setSavedProgress] = useState<number>(0);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [initialTime, setInitialTime] = useState<number>(0);
  const lastSavedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (id) {
      fetchMovie();
      fetchSubtitles();
      if (user) {
        fetchWatchProgress();
      }
    }
  }, [id, user]);

  const fetchMovie = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching movie:', error);
    } else {
      setMovie(data as any);
    }
    setIsLoading(false);
  };

  const fetchSubtitles = async () => {
    const { data, error } = await supabase
      .from('subtitles')
      .select('id, language, subtitle_url')
      .eq('movie_id', id);

    if (!error && data) {
      setSubtitles(data);
    }
  };

  const fetchWatchProgress = async () => {
    if (!user || !id) return;

    const { data, error } = await supabase
      .from('watched_movies')
      .select('progress_seconds, completed')
      .eq('user_id', user.id)
      .eq('movie_id', id)
      .maybeSingle();

    if (!error && data) {
      // Only show dialog if not completed and has progress > 30s
      if (data.progress_seconds && data.progress_seconds > 30 && !data.completed) {
        setSavedProgress(data.progress_seconds);
        setShowContinueDialog(true);
      }
    }
  };

  const saveWatchProgress = useCallback(async (currentTime: number) => {
    if (!user || !id) return;
    
    // Only save every 10 seconds to avoid too many requests
    if (Math.abs(currentTime - lastSavedTimeRef.current) < 10) return;
    lastSavedTimeRef.current = currentTime;

    await supabase
      .from('watched_movies')
      .upsert({
        user_id: user.id,
        movie_id: id,
        progress_seconds: Math.floor(currentTime),
        completed: false,
      }, { onConflict: 'user_id,movie_id' });
  }, [user, id]);

  const handleContinue = () => {
    setInitialTime(savedProgress);
    setShowContinueDialog(false);
  };

  const handleRestart = () => {
    setInitialTime(0);
    setShowContinueDialog(false);
  };

  const hasPart2 = movie?.video_url_part2;
  const currentVideoUrl = currentPart === 1 ? movie?.video_url : movie?.video_url_part2;

  const handleNextPart = () => {
    if (currentPart === 1 && hasPart2) {
      setCurrentPart(2);
      setInitialTime(0);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 text-center">
          <h1 className="font-display text-2xl text-muted-foreground">
            Filme não encontrado
          </h1>
          <Button asChild className="mt-4">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Continue Watching Dialog */}
      <ContinueWatchingDialog
        open={showContinueDialog}
        onOpenChange={setShowContinueDialog}
        progressSeconds={savedProgress}
        onContinue={handleContinue}
        onRestart={handleRestart}
      />

      {/* Hero Background */}
      <div className="relative h-[35vh] sm:h-[50vh] overflow-hidden">
        {movie.thumbnail ? (
          <img
            src={movie.thumbnail}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-hero-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <main className="relative z-10 -mt-20 sm:-mt-40 pb-8 sm:pb-12">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Back Button */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 sm:mb-6 text-muted-foreground hover:text-foreground"
          >
            <Link to="/movies">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Part Selector */}
              {hasPart2 && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={currentPart === 1 ? 'default' : 'outline'}
                    onClick={() => { setCurrentPart(1); setInitialTime(0); }}
                    size="sm"
                  >
                    Parte 1
                  </Button>
                  <Button
                    variant={currentPart === 2 ? 'default' : 'outline'}
                    onClick={() => { setCurrentPart(2); setInitialTime(0); }}
                    size="sm"
                  >
                    Parte 2
                  </Button>
                </div>
              )}

              {/* Video Player */}
              {currentVideoUrl && getSourceType(currentVideoUrl) === 'iframe' ? (
                <IframePlayer src={currentVideoUrl} />
              ) : (
                <VideoPlayer
                  src={currentVideoUrl || null}
                  poster={movie.thumbnail}
                  title={hasPart2 ? `${movie.title} - Parte ${currentPart}` : movie.title}
                  subtitles={subtitles}
                  nextLabel={currentPart === 1 && hasPart2 ? 'Parte 2' : undefined}
                  onNextClick={currentPart === 1 && hasPart2 ? handleNextPart : undefined}
                  onTimeUpdate={saveWatchProgress}
                  initialTime={initialTime}
                />
              )}

              {/* Movie Info */}
              <div>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                  {movie.title}
                </h1>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                  {movie.release_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {movie.release_year}
                    </span>
                  )}
                  {movie.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {movie.duration}
                    </span>
                  )}
                  {movie.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {movie.category}
                    </span>
                  )}
                  {movie.rating && (
                    <span className="px-1.5 sm:px-2 py-0.5 border border-muted-foreground/50 rounded text-[10px] sm:text-xs">
                      {movie.rating}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <FavoriteButton movieId={movie.id} showLabel variant="outline" />
                  <ShareButtons title={movie.title} description={movie.description || ''} showLabel variant="outline" />
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                    <RatingStars movieId={movie.id} size="default" />
                  </div>
                </div>

                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {movie.description || 'Sem descrição disponível.'}
                </p>

                <div className="mt-6">
                  <ChatangoWidget variant="inline" />
                </div>
              </div>

              {/* Comments */}
              <CommentSection movieId={movie.id} />
            </div>

            {/* Sidebar - Hidden on mobile, shows below on tablet */}
            <div className="space-y-6 hidden lg:block">
              {/* Poster */}
              {movie.thumbnail && (
                <div className="aspect-[2/3] rounded-xl overflow-hidden border border-border">
                  <img
                    src={movie.thumbnail}
                    alt={movie.title}
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
                    <dd className="font-semibold">{movie.title}</dd>
                  </div>
                  {movie.release_year && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Ano</dt>
                      <dd>{movie.release_year}</dd>
                    </div>
                  )}
                  {movie.duration && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Duração</dt>
                      <dd>{movie.duration}</dd>
                    </div>
                  )}
                  {movie.category && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Gênero</dt>
                      <dd>{movie.category}</dd>
                    </div>
                  )}
                  {movie.rating && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Classificação</dt>
                      <dd>{movie.rating}</dd>
                    </div>
                  )}
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

export default MovieDetail;
