import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HeroCarousel } from '@/components/HeroCarousel';
import { ContentRow } from '@/components/ContentRow';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Movie, Series } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (profile && (!profile.username || !profile.avatar_url)) {
        navigate('/profile-setup');
      } else if (!profile) {
        navigate('/');
      }
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchContent();
    }
  }, [user]);

  const fetchContent = async () => {
    try {
      const [moviesRes, seriesRes] = await Promise.all([
        supabase.from('movies').select('*').order('title', { ascending: true }),
        supabase.from('series').select('*').order('title', { ascending: true }),
      ]);

      if (moviesRes.data) setMovies(moviesRes.data);
      if (seriesRes.data) setSeries(seriesRes.data);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
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
      <main className="relative z-10 -mt-32 pb-10">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
        
        {releases.length > 0 && (
          <ContentRow title="Lançamentos" items={releases} type="mixed" />
        )}
        <ContentRow title="Filmes" items={recentMovies} type="movie" />
        <ContentRow title="Séries" items={recentSeries} type="series" />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
