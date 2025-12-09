import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoPlayer } from '@/components/VideoPlayer';
import { CommentSection } from '@/components/CommentSection';
import { PageLoader } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Movie } from '@/types/database';

const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie & { video_url_part2?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState<1 | 2>(1);

  useEffect(() => {
    if (id) {
      fetchMovie();
    }
  }, [id]);

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

  const hasPart2 = movie?.video_url_part2;
  const currentVideoUrl = currentPart === 1 ? movie?.video_url : movie?.video_url_part2;

  const handleNextPart = () => {
    if (currentPart === 1 && hasPart2) {
      setCurrentPart(2);
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

      {/* Hero Background */}
      <div className="relative h-[50vh] overflow-hidden">
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

      <main className="relative z-10 -mt-40 pb-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button
            asChild
            variant="ghost"
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <Link to="/movies">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Part Selector */}
              {hasPart2 && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={currentPart === 1 ? 'default' : 'outline'}
                    onClick={() => setCurrentPart(1)}
                    size="sm"
                  >
                    Parte 1
                  </Button>
                  <Button
                    variant={currentPart === 2 ? 'default' : 'outline'}
                    onClick={() => setCurrentPart(2)}
                    size="sm"
                  >
                    Parte 2
                  </Button>
                </div>
              )}

              {/* Video Player */}
              <VideoPlayer
                src={currentVideoUrl || null}
                poster={movie.thumbnail}
                title={hasPart2 ? `${movie.title} - Parte ${currentPart}` : movie.title}
                nextLabel={currentPart === 1 && hasPart2 ? 'Parte 2' : undefined}
                onNextClick={currentPart === 1 && hasPart2 ? handleNextPart : undefined}
              />

              {/* Movie Info */}
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                  {movie.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  {movie.release_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {movie.release_year}
                    </span>
                  )}
                  {movie.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {movie.duration}
                    </span>
                  )}
                  {movie.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      {movie.category}
                    </span>
                  )}
                  {movie.rating && (
                    <span className="px-2 py-0.5 border border-muted-foreground/50 rounded text-xs">
                      {movie.rating}
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {movie.description || 'Sem descrição disponível.'}
                </p>
              </div>

              {/* Comments */}
              <CommentSection movieId={movie.id} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
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
