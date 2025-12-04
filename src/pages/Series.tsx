import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Series as SeriesType } from '@/types/database';
import { Tv } from 'lucide-react';

const Series = () => {
  const [series, setSeries] = useState<SeriesType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching series:', error);
    } else {
      setSeries(data || []);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const categories = ['all', ...new Set(series.map((s) => s.category).filter(Boolean))];
  const filteredSeries =
    selectedCategory === 'all'
      ? series
      : series.filter((s) => s.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <Tv className="w-8 h-8 text-primary" />
              Séries
            </h1>
            <p className="text-muted-foreground">
              Explore nossa coleção completa de séries
            </p>
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
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
                  {category === 'all' ? 'Todas' : category}
                </button>
              ))}
            </div>
          )}

          {/* Series Grid */}
          {filteredSeries.length === 0 ? (
            <div className="text-center py-20">
              <Tv className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl text-muted-foreground">
                Nenhuma série encontrada
              </h2>
              <p className="text-muted-foreground mt-2">
                Adicione séries pelo painel administrativo
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredSeries.map((item, index) => (
                <ContentCard key={item.id} item={item} type="series" index={index} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Series;
