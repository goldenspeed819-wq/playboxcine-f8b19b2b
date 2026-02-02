import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Film, Tv } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PageLoader } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Movie, Series } from '@/types/database';
import { cn } from '@/lib/utils';

interface FavoriteItem {
  id: string;
  movie_id: string | null;
  series_id: string | null;
  created_at: string;
  movie?: Movie;
  series?: Series;
}

const Favorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('favorites')
      .select('id, movie_id, series_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      setIsLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const movieIds = data.filter((f) => f.movie_id).map((f) => f.movie_id!);
      const seriesIds = data.filter((f) => f.series_id).map((f) => f.series_id!);

      const [moviesRes, seriesRes] = await Promise.all([
        movieIds.length > 0
          ? supabase.from('movies').select('*').in('id', movieIds)
          : Promise.resolve({ data: [] }),
        seriesIds.length > 0
          ? supabase.from('series').select('*').in('id', seriesIds)
          : Promise.resolve({ data: [] }),
      ]);

      const movieMap = new Map((moviesRes.data || []).map((m) => [m.id, m]));
      const seriesMap = new Map((seriesRes.data || []).map((s) => [s.id, s]));

      const enrichedFavorites = data.map((f) => ({
        ...f,
        movie: f.movie_id ? movieMap.get(f.movie_id) : undefined,
        series: f.series_id ? seriesMap.get(f.series_id) : undefined,
      }));

      setFavorites(enrichedFavorites);
    }

    setIsLoading(false);
  };

  const removeFavorite = async (favoriteId: string) => {
    const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);

    if (!error) {
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    }
  };

  const filteredFavorites = favorites.filter((f) => {
    if (activeTab === 'movies') return !!f.movie_id;
    if (activeTab === 'series') return !!f.series_id;
    return true;
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 text-center">
          <h1 className="font-display text-2xl text-muted-foreground">
            Faça login para ver seus favoritos
          </h1>
          <Button asChild className="mt-4">
            <Link to="/auth">Fazer Login</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="w-8 h-8 text-primary fill-primary" />
            <h1 className="font-display text-3xl font-bold">Meus Favoritos</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all" className="gap-2">
                Todos ({favorites.length})
              </TabsTrigger>
              <TabsTrigger value="movies" className="gap-2">
                <Film className="w-4 h-4" />
                Filmes ({favorites.filter((f) => f.movie_id).length})
              </TabsTrigger>
              <TabsTrigger value="series" className="gap-2">
                <Tv className="w-4 h-4" />
                Séries ({favorites.filter((f) => f.series_id).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredFavorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Heart className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Nenhum favorito ainda</h2>
                  <p className="text-muted-foreground mb-6">
                    Adicione filmes e séries aos seus favoritos para vê-los aqui.
                  </p>
                  <div className="flex gap-4">
                    <Button asChild variant="outline">
                      <Link to="/movies">Ver Filmes</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/series">Ver Séries</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredFavorites.map((favorite) => {
                    const item = favorite.movie || favorite.series;
                    const type = favorite.movie_id ? 'movie' : 'series';
                    
                    if (!item) return null;

                    return (
                      <div key={favorite.id} className="group relative">
                        <Link
                          to={`/${type}/${type === 'movie' ? favorite.movie_id : favorite.series_id}`}
                          className="block"
                        >
                          <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {type === 'movie' ? (
                                  <Film className="w-12 h-12 text-muted-foreground" />
                                ) : (
                                  <Tv className="w-12 h-12 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-sm font-semibold line-clamp-2">
                                {item.title}
                              </p>
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={() => removeFavorite(favorite.id)}
                          className={cn(
                            'absolute top-2 right-2 p-1.5 rounded-full',
                            'bg-background/80 backdrop-blur-sm',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'hover:bg-destructive hover:text-destructive-foreground'
                          )}
                          title="Remover dos favoritos"
                        >
                          <Heart className="w-4 h-4 fill-primary text-primary" />
                        </button>
                        <p className="mt-2 text-sm font-medium line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {type === 'movie' ? 'Filme' : 'Série'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;
