import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Movie } from '@/types/database';
import { Film, Search } from 'lucide-react';

const Movies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching movies:', error);
    } else {
      setMovies(data || []);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const categories = ['all', ...new Set(movies.map((m) => m.category).filter(Boolean))];
  
  let filteredMovies = movies;
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredMovies = filteredMovies.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query)
    );
  }
  
  // Apply category filter
  if (selectedCategory !== 'all') {
    filteredMovies = filteredMovies.filter((m) => m.category === selectedCategory);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <Film className="w-8 h-8 text-primary" />
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Filmes'}
            </h1>
            <p className="text-muted-foreground">
              {searchQuery 
                ? `${filteredMovies.length} filme(s) encontrado(s)`
                : 'Explore nossa coleção completa de filmes'}
            </p>
          </div>

          {/* Category Filter */}
          {!searchQuery && categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as string)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {category === 'all' ? 'Todos' : category}
                </button>
              ))}
            </div>
          )}

          {/* Movies Grid */}
          {filteredMovies.length === 0 ? (
            <div className="text-center py-20">
              {searchQuery ? (
                <>
                  <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-display text-xl text-muted-foreground">
                    Nenhum resultado para "{searchQuery}"
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Tente buscar por outro termo
                  </p>
                </>
              ) : (
                <>
                  <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-display text-xl text-muted-foreground">
                    Nenhum filme encontrado
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Adicione filmes pelo painel administrativo
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredMovies.map((movie, index) => (
                <ContentCard key={movie.id} item={movie} type="movie" index={index} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Movies;
