import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { PageLoader } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Search as SearchIcon, Film, Tv, Radio } from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string | null;
  description: string | null;
}

interface Series {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string | null;
  description: string | null;
}

interface LiveChannel {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string | null;
  description: string | null;
  is_live: boolean | null;
}

const Search = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series' | 'live'>('all');

  useEffect(() => {
    if (searchQuery) {
      fetchResults();
    } else {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchResults = async () => {
    setIsLoading(true);
    const query = searchQuery.toLowerCase();

    const [moviesRes, seriesRes, channelsRes] = await Promise.all([
      supabase.from('movies').select('id, title, thumbnail, category, description'),
      supabase.from('series').select('id, title, thumbnail, category, description'),
      supabase.from('live_channels').select('id, title, thumbnail, category, description, is_live').eq('is_live', true)
    ]);

    // Filter results
    const filteredMovies = (moviesRes.data || []).filter(m => 
      m.title.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.category?.toLowerCase().includes(query)
    );

    const filteredSeries = (seriesRes.data || []).filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.category?.toLowerCase().includes(query)
    );

    const filteredChannels = (channelsRes.data || []).filter(c => 
      c.title.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query) ||
      c.category?.toLowerCase().includes(query)
    );

    setMovies(filteredMovies);
    setSeries(filteredSeries);
    setChannels(filteredChannels);
    setIsLoading(false);
  };

  const totalResults = movies.length + series.length + channels.length;

  const tabs = [
    { id: 'all', label: 'Todos', count: totalResults },
    { id: 'movies', label: 'Filmes', count: movies.length, icon: Film },
    { id: 'series', label: 'Séries', count: series.length, icon: Tv },
    { id: 'live', label: 'Ao Vivo', count: channels.length, icon: Radio },
  ];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <SearchIcon className="w-8 h-8 text-primary" />
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Busca'}
            </h1>
            <p className="text-muted-foreground">
              {searchQuery 
                ? `${totalResults} resultado(s) encontrado(s)`
                : 'Digite algo para buscar'}
            </p>
          </div>

          {/* Tabs */}
          {searchQuery && totalResults > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.label}
                  <span className="bg-background/20 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!searchQuery ? (
            <div className="text-center py-20">
              <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl text-muted-foreground">
                Use a barra de busca para encontrar conteúdo
              </h2>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-20">
              <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl text-muted-foreground">
                Nenhum resultado para "{searchQuery}"
              </h2>
              <p className="text-muted-foreground mt-2">
                Tente buscar por outro termo
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Movies */}
              {(activeTab === 'all' || activeTab === 'movies') && movies.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                    <Film className="w-6 h-6 text-primary" />
                    Filmes ({movies.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {movies.map((movie, index) => (
                      <ContentCard key={movie.id} item={movie as any} type="movie" index={index} />
                    ))}
                  </div>
                </section>
              )}

              {/* Series */}
              {(activeTab === 'all' || activeTab === 'series') && series.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                    <Tv className="w-6 h-6 text-primary" />
                    Séries ({series.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {series.map((s, index) => (
                      <ContentCard key={s.id} item={s as any} type="series" index={index} />
                    ))}
                  </div>
                </section>
              )}

              {/* Live Channels */}
              {(activeTab === 'all' || activeTab === 'live') && channels.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                    <Radio className="w-6 h-6 text-red-500" />
                    Canais ao Vivo ({channels.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {channels.map((channel) => (
                      <Link
                        key={channel.id}
                        to={`/live?channel=${channel.id}`}
                        className="group"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
                          {channel.thumbnail ? (
                            <img
                              src={channel.thumbnail}
                              alt={channel.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/20 to-primary/20">
                              <Radio className="w-10 h-10 text-red-500" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 rounded text-xs font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            AO VIVO
                          </div>
                        </div>
                        <h3 className="mt-2 font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {channel.title}
                        </h3>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;
