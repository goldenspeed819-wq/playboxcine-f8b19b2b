import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HeroCarousel } from '@/components/HeroCarousel';
import { ContentRow } from '@/components/ContentRow';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Movie, Series } from '@/types/database';

const Index = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [moviesRes, seriesRes] = await Promise.all([
        supabase.from('movies').select('*').order('created_at', { ascending: false }),
        supabase.from('series').select('*').order('created_at', { ascending: false }),
      ]);

      if (moviesRes.data) setMovies(moviesRes.data);
      if (seriesRes.data) setSeries(seriesRes.data);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const featuredMovies = movies.filter((m) => m.is_featured);
  const featuredSeries = series.filter((s) => s.is_featured);
  const featured = [...featuredMovies, ...featuredSeries];
  
  const recentMovies = movies.slice(0, 10);
  const recentSeries = series.slice(0, 10);
  
  // Filter by is_release for "Lançamentos"
  const releaseMovies = movies.filter((m) => m.is_release);
  const releaseSeries = series.filter((s) => s.is_release);
  const releases = [...releaseMovies, ...releaseSeries];
  
  // Fallback for hero carousel
  const allContent = [...movies, ...series].slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <HeroCarousel
        items={featured.length > 0 ? featured : allContent}
        type={featured.length > 0 && featuredMovies.length > 0 ? 'movie' : 'series'}
      />

      {/* Content Sections */}
      <main className="relative z-10 -mt-20">
        {releases.length > 0 && (
          <ContentRow title="Lançamentos" items={releases} type="movie" />
        )}
        <ContentRow title="Filmes" items={recentMovies} type="movie" />
        <ContentRow title="Séries" items={recentSeries} type="series" />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
