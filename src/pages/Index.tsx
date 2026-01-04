import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HeroCarousel } from '@/components/HeroCarousel';
import { ContentRow } from '@/components/ContentRow';
import { PageLoader } from '@/components/LoadingSpinner';
import { UpdateNotification } from '@/components/UpdateNotification';
import { BanCheck } from '@/components/BanCheck';
import { AdminNotificationBanner } from '@/components/AdminNotificationBanner';
import { ContinueWatchingRow } from '@/components/ContinueWatchingRow';
import { TVModeIndicator } from '@/components/TVModeIndicator';
import { supabase } from '@/integrations/supabase/client';
import { Movie, Series } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useTVMode } from '@/contexts/TVModeContext';

const Index = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const { isTVMode } = useTVMode();
  const navigate = useNavigate();

  // TV Navigation state
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedItem, setFocusedItem] = useState(0);

  const handleBanned = useCallback(() => {
    setIsBanned(true);
    signOut();
  }, [signOut]);

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

  // Build rows data
  const featuredMovies = movies.filter((m) => m.is_featured);
  const featuredSeries = series.filter((s) => s.is_featured);
  const featured = [...featuredMovies, ...featuredSeries];
  const recentMovies = movies.slice(0, 10);
  const recentSeries = series.slice(0, 10);
  const releaseMovies = movies.filter((m) => m.is_release);
  const releaseSeries = series.filter((s) => s.is_release);
  const releases = [...releaseMovies, ...releaseSeries];

  // Calculate rows for TV navigation
  const rows = [
    { id: 'releases', items: releases, title: 'Lançamentos', type: 'mixed' as const },
    { id: 'movies', items: recentMovies, title: 'Filmes', type: 'movie' as const },
    { id: 'series', items: recentSeries, title: 'Séries', type: 'series' as const },
  ].filter(row => row.items.length > 0);

  // TV Mode keyboard navigation
  useEffect(() => {
    if (!isTVMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentRowItems = rows[focusedRow]?.items.length || 0;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedRow(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedRow(prev => Math.min(rows.length - 1, prev + 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedItem(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedItem(prev => Math.min(currentRowItems - 1, prev + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTVMode, focusedRow, rows]);

  // Adjust focusedItem when changing rows
  useEffect(() => {
    const maxItems = rows[focusedRow]?.items.length || 0;
    if (focusedItem >= maxItems) {
      setFocusedItem(Math.max(0, maxItems - 1));
    }
  }, [focusedRow, focusedItem, rows]);

  if (authLoading || isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const allContent = [...movies, ...series].slice(0, 5);

  if (isBanned) {
    return <BanCheck userId={user?.id} onBanned={handleBanned} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Ban Check */}
      <BanCheck userId={user?.id} onBanned={handleBanned} />
      
      {/* Update Notification */}
      <UpdateNotification userId={user?.id} />
      
      {/* Admin Notification Banner */}
      <AdminNotificationBanner userId={user?.id} />
      
      {/* TV Mode Indicator */}
      <TVModeIndicator />
      
      {/* Hero Section */}
      <HeroCarousel
        items={featured.length > 0 ? featured : allContent}
        type={featured.length > 0 && featuredMovies.length > 0 ? 'movie' : 'series'}
      />

      {/* Content Sections */}
      <main className="relative z-10 -mt-32 pb-10">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
        
        {/* Continue Watching */}
        <ContinueWatchingRow />
        
        {rows.map((row, rowIndex) => (
          <ContentRow 
            key={row.id}
            title={row.title} 
            items={row.items} 
            type={row.type}
            rowIndex={rowIndex}
            isRowFocused={isTVMode && focusedRow === rowIndex}
            focusedItemIndex={focusedItem}
          />
        ))}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
