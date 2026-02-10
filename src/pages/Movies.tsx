import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Movie } from '@/types/database';
import { Film, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from '@/constants/categories';

const Movies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAllCategories, setShowAllCategories] = useState(false);
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

  // Extract unique individual categories from comma-separated DB values
  const availableCategories = new Set<string>();
  movies.forEach(m => {
    if (m.category) {
      m.category.split(',').map(c => c.trim()).filter(Boolean).forEach(c => availableCategories.add(c));
    }
  });
  // Use predefined categories order, filtered to only those present in data
  const orderedCategories = CATEGORIES.filter(c => availableCategories.has(c));
  const visibleCategories = showAllCategories ? orderedCategories : orderedCategories.slice(0, 8);
  
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
  
  // Apply category filter - match any movie that contains this category
  if (selectedCategory !== 'all') {
    filteredMovies = filteredMovies.filter((m) => {
      if (!m.category) return false;
      const cats = m.category.split(',').map(c => c.trim());
      return cats.includes(selectedCategory);
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 sm:pt-24 pb-8 sm:pb-12">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              <Film className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Filmes'}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {searchQuery 
                ? `${filteredMovies.length} filme(s) encontrado(s)`
                : 'Explore nossa coleção completa de filmes'}
            </p>
          </div>

          {/* Category Filter */}
          {!searchQuery && orderedCategories.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  Todos
                </button>
                {visibleCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {orderedCategories.length > 8 && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {showAllCategories ? (
                    <><ChevronUp className="w-3 h-3" /> Mostrar menos</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> Mostrar todas ({orderedCategories.length})</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Movies Grid */}
          {filteredMovies.length === 0 ? (
            <div className="text-center py-12 sm:py-20">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h2 className="font-display text-lg sm:text-xl text-muted-foreground">
                    Nenhum resultado para "{searchQuery}"
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                    Tente buscar por outro termo
                  </p>
                </>
              ) : (
                <>
                  <Film className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h2 className="font-display text-lg sm:text-xl text-muted-foreground">
                    Nenhum filme encontrado
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                    Adicione filmes pelo painel administrativo
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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
