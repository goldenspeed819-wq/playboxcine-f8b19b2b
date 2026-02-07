import { useState } from 'react';
import { Search, Film, Tv, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TMDBResult {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  rating: number;
  genres: string[];
}

interface TMDBDetails extends TMDBResult {
  contentRating: string;
  duration: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

interface TMDBSearchProps {
  type: 'movie' | 'tv';
  onSelect: (data: TMDBDetails) => void;
}

export function TMDBSearch({ type, onSelect }: TMDBSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tmdb-search?action=search&query=${encodeURIComponent(query)}&type=${type}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar no TMDB');
      }

      setResults(result.results || []);

      if (result.results?.length === 0) {
        toast({
          title: 'Nenhum resultado',
          description: 'Tente buscar com outro termo.',
        });
      }
    } catch (error) {
      console.error('TMDB search error:', error);
      toast({
        title: 'Erro na busca',
        description: error instanceof Error ? error.message : 'Não foi possível buscar no TMDB',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (item: TMDBResult) => {
    setIsLoadingDetails(item.id);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tmdb-search?action=details&id=${item.id}&type=${type}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const details = await response.json();

      if (!response.ok) {
        throw new Error(details.error || 'Erro ao buscar detalhes');
      }

      onSelect(details);
      setOpen(false);
      setQuery('');
      setResults([]);

      toast({
        title: 'Dados importados!',
        description: `"${details.title}" foi importado do TMDB.`,
      });
    } catch (error) {
      console.error('TMDB details error:', error);
      toast({
        title: 'Erro ao importar',
        description: error instanceof Error ? error.message : 'Não foi possível importar os dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDetails(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {type === 'movie' ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
          Buscar no TMDB
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Buscar {type === 'movie' ? 'Filme' : 'Série'} no TMDB
          </DialogTitle>
          <DialogDescription>
            Busque e importe automaticamente título, descrição, capa e outras informações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={`Nome do ${type === 'movie' ? 'filme' : 'série'}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px] pr-4">
            {results.length === 0 && !isSearching && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Digite o nome para buscar no TMDB</p>
              </div>
            )}

            {isSearching && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Buscando...</p>
              </div>
            )}

            <div className="space-y-2">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  disabled={isLoadingDetails !== null}
                  className={cn(
                    'w-full flex gap-4 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left',
                    isLoadingDetails === item.id && 'opacity-70'
                  )}
                >
                  {/* Poster */}
                  <div className="w-16 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.posterUrl ? (
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {type === 'movie' ? (
                          <Film className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <Tv className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-1">
                          {item.title}
                        </h4>
                        {item.originalTitle !== item.title && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.originalTitle}
                          </p>
                        )}
                      </div>
                      {isLoadingDetails === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-primary flex-shrink-0 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {item.releaseYear && <span>{item.releaseYear}</span>}
                      {item.rating > 0 && (
                        <span className="flex items-center gap-1">
                          ⭐ {item.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.genres.slice(0, 3).map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.overview && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {item.overview}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
