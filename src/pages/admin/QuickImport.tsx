import { useState } from 'react';
import { Tv, Film, Loader2, CheckCircle, XCircle, RefreshCw, Search, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const buildPlayerBase = (domain: string, serverNum: string) =>
  `https://${domain}/player3/server.php?server=RCServer${serverNum}&subfolder=ondemand&vid=`;

interface SeriesImportResult {
  season: number;
  episode: number;
  url: string;
  status: 'pending' | 'success' | 'error';
}

interface MovieImportResult {
  title: string;
  abbreviation: string;
  url: string;
  status: 'pending' | 'success' | 'error';
}

export default function QuickImport() {
  const { toast } = useToast();

  // Server config
  const [playerDomain, setPlayerDomain] = useState('redecanais.cafe');
  const [serverNum, setServerNum] = useState('21');
  const PLAYER_BASE = buildPlayerBase(playerDomain, serverNum);

  // Series state
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesAbbreviation, setSeriesAbbreviation] = useState('');
  const [seriesResults, setSeriesResults] = useState<SeriesImportResult[]>([]);
  const [isImportingSeries, setIsImportingSeries] = useState(false);
  const [tmdbInfo, setTmdbInfo] = useState<{ seasons: { season_number: number; episode_count: number }[]; name: string; overview: string; poster: string; year: string; genres: string[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Movie state
  const [movieTitle, setMovieTitle] = useState('');
  const [movieAbbreviation, setMovieAbbreviation] = useState('');
  const [movieResults, setMovieResults] = useState<MovieImportResult[]>([]);
  const [isImportingMovie, setIsImportingMovie] = useState(false);

  // Domain updater state
  const [oldDomain, setOldDomain] = useState('redecanais.cafe');
  const [newDomain, setNewDomain] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStats, setUpdateStats] = useState<{ movies: number; episodes: number } | null>(null);

  // Search TMDB for series info
  const handleSearchTMDB = async () => {
    if (!seriesTitle.trim()) return;
    setIsSearching(true);
    setTmdbInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke('tmdb-search', {
        body: { query: seriesTitle, type: 'tv' },
      });

      if (error) throw error;

      if (data?.results?.length > 0) {
        const show = data.results[0];
        // Get detailed info with seasons
        const { data: detailData } = await supabase.functions.invoke('tmdb-search', {
          body: { tmdbId: show.id, type: 'tv' },
        });

        if (detailData) {
          const seasons = (detailData.seasons || [])
            .filter((s: any) => s.season_number > 0)
            .map((s: any) => ({ season_number: s.season_number, episode_count: s.episode_count }));

          setTmdbInfo({
            seasons,
            name: detailData.name || show.name,
            overview: detailData.overview || show.overview || '',
            poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
            year: (show.first_air_date || '').substring(0, 4),
            genres: (detailData.genres || []).map((g: any) => g.name),
          });

          // Generate preview URLs
          const results: SeriesImportResult[] = [];
          for (const season of seasons) {
            for (let ep = 1; ep <= season.episode_count; ep++) {
              const seasonStr = String(season.season_number).padStart(2, '0');
              const epStr = String(ep).padStart(2, '0');
              const vid = `${seriesAbbreviation.toUpperCase()}RT${seasonStr}EP${epStr}`;
              results.push({
                season: season.season_number,
                episode: ep,
                url: `${PLAYER_BASE}${vid}`,
                status: 'pending',
              });
            }
          }
          setSeriesResults(results);
          toast({ title: `${detailData.name || show.name}`, description: `${seasons.length} temporada(s), ${results.length} episódio(s) detectados` });
        }
      } else {
        toast({ title: 'Série não encontrada no TMDB', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro ao buscar no TMDB', description: String(e), variant: 'destructive' });
    }

    setIsSearching(false);
  };

  // Import series with all episodes
  const handleImportSeries = async () => {
    if (!tmdbInfo || seriesResults.length === 0 || !seriesAbbreviation) return;
    setIsImportingSeries(true);

    try {
      // Create series entry
      const { data: seriesData, error: seriesError } = await supabase.from('series').insert({
        title: tmdbInfo.name,
        description: tmdbInfo.overview,
        thumbnail: tmdbInfo.poster,
        release_year: tmdbInfo.year ? parseInt(tmdbInfo.year) : null,
        category: tmdbInfo.genres.join(', '),
        rating: 'Livre',
      }).select().single();

      if (seriesError) throw seriesError;

      // Insert episodes in batches
      const batchSize = 20;
      const updatedResults = [...seriesResults];

      for (let i = 0; i < seriesResults.length; i += batchSize) {
        const batch = seriesResults.slice(i, i + batchSize);
        const episodes = batch.map(r => ({
          series_id: seriesData.id,
          season: r.season,
          episode: r.episode,
          video_url: r.url,
          title: `Episódio ${r.episode}`,
        }));

        const { error } = await supabase.from('episodes').insert(episodes);
        
        batch.forEach((_, j) => {
          updatedResults[i + j] = { ...updatedResults[i + j], status: error ? 'error' : 'success' };
        });
        setSeriesResults([...updatedResults]);
      }

      const successCount = updatedResults.filter(r => r.status === 'success').length;
      toast({ title: 'Série importada!', description: `${tmdbInfo.name} com ${successCount} episódios` });
    } catch (e) {
      toast({ title: 'Erro na importação', description: String(e), variant: 'destructive' });
    }

    setIsImportingSeries(false);
  };

  // Import movie
  const handleImportMovie = async () => {
    if (!movieTitle.trim() || !movieAbbreviation.trim()) return;
    setIsImportingMovie(true);

    const vid = movieAbbreviation.toUpperCase();
    const url = `${PLAYER_BASE}${vid}`;

    try {
      // Search TMDB for movie metadata
      let metadata: any = { title: movieTitle };

      try {
        const { data } = await supabase.functions.invoke('tmdb-search', {
          body: { query: movieTitle, type: 'movie' },
        });
        if (data?.results?.length > 0) {
          const m = data.results[0];
          metadata = {
            title: m.title || movieTitle,
            description: m.overview || '',
            thumbnail: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
            release_year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
            rating: 'Livre',
          };
        }
      } catch { /* skip tmdb enrichment on error */ }

      const { error } = await supabase.from('movies').insert({
        ...metadata,
        video_url: url,
      });

      if (error) throw error;

      setMovieResults([{ title: metadata.title, abbreviation: vid, url, status: 'success' }]);
      toast({ title: 'Filme importado!', description: metadata.title });
    } catch (e) {
      setMovieResults([{ title: movieTitle, abbreviation: vid, url, status: 'error' }]);
      toast({ title: 'Erro ao importar filme', description: String(e), variant: 'destructive' });
    }

    setIsImportingMovie(false);
  };

  // Update domains
  const handleUpdateDomains = async () => {
    if (!oldDomain.trim() || !newDomain.trim()) return;
    setIsUpdating(true);
    setUpdateStats(null);

    try {
      // Get all movies with the old domain
      const { data: movies } = await supabase.from('movies').select('id, video_url, video_url_part2');
      let movieCount = 0;

      if (movies) {
        for (const movie of movies) {
          const updates: any = {};
          if (movie.video_url?.includes(oldDomain)) {
            updates.video_url = movie.video_url.replace(new RegExp(oldDomain.replace('.', '\\.'), 'g'), newDomain);
          }
          if (movie.video_url_part2?.includes(oldDomain)) {
            updates.video_url_part2 = movie.video_url_part2.replace(new RegExp(oldDomain.replace('.', '\\.'), 'g'), newDomain);
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from('movies').update(updates).eq('id', movie.id);
            movieCount++;
          }
        }
      }

      // Get all episodes with the old domain
      const { data: episodes } = await supabase.from('episodes').select('id, video_url');
      let episodeCount = 0;

      if (episodes) {
        for (const ep of episodes) {
          if (ep.video_url?.includes(oldDomain)) {
            const newUrl = ep.video_url.replace(new RegExp(oldDomain.replace('.', '\\.'), 'g'), newDomain);
            await supabase.from('episodes').update({ video_url: newUrl }).eq('id', ep.id);
            episodeCount++;
          }
        }
      }

      setUpdateStats({ movies: movieCount, episodes: episodeCount });
      toast({
        title: 'Domínios atualizados!',
        description: `${movieCount} filmes e ${episodeCount} episódios atualizados`,
      });
    } catch (e) {
      toast({ title: 'Erro ao atualizar domínios', description: String(e), variant: 'destructive' });
    }

    setIsUpdating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Importação Rápida</h1>
        <p className="text-muted-foreground mt-1">Adicione conteúdo por abreviação ou atualize domínios em massa</p>
      </div>

      <Tabs defaultValue="series" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="series" className="gap-2"><Tv className="w-4 h-4" /> Série</TabsTrigger>
          <TabsTrigger value="movie" className="gap-2"><Film className="w-4 h-4" /> Filme</TabsTrigger>
          <TabsTrigger value="domains" className="gap-2"><Link2 className="w-4 h-4" /> Domínios</TabsTrigger>
        </TabsList>

        {/* SERIES TAB */}
        <TabsContent value="series" className="space-y-4">
          <div className="premium-card p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Série</Label>
                <Input
                  placeholder="Ex: One Piece - Live Action"
                  value={seriesTitle}
                  onChange={e => setSeriesTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Abreviação (RedeCanais)</Label>
                <Input
                  placeholder="Ex: ONPCEAS"
                  value={seriesAbbreviation}
                  onChange={e => setSeriesAbbreviation(e.target.value.toUpperCase())}
                  className="uppercase font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Como funciona:</p>
              <p>• O padrão gerado será: <code className="text-primary">{seriesAbbreviation || 'ABREV'}RT01EP01</code></p>
              <p>• T01 = Temporada 1, EP01 = Episódio 1</p>
              <p>• O TMDB API detecta automaticamente quantas temporadas e episódios existem</p>
            </div>

            <Button
              onClick={handleSearchTMDB}
              disabled={!seriesTitle.trim() || !seriesAbbreviation.trim() || isSearching}
              className="gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar no TMDB
            </Button>
          </div>

          {/* TMDB Info */}
          {tmdbInfo && (
            <div className="premium-card p-5 space-y-4">
              <div className="flex gap-4">
                {tmdbInfo.poster && (
                  <img src={tmdbInfo.poster} alt={tmdbInfo.name} className="w-24 h-36 rounded-lg object-cover shrink-0" />
                )}
                <div className="space-y-1 min-w-0">
                  <h3 className="font-heading font-bold text-lg">{tmdbInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">{tmdbInfo.year} • {tmdbInfo.genres.join(', ')}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{tmdbInfo.overview}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tmdbInfo.seasons.map(s => (
                      <span key={s.season_number} className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
                        T{s.season_number}: {s.episode_count} eps
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleImportSeries}
                disabled={isImportingSeries}
                className="gap-2 w-full"
              >
                {isImportingSeries ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Importar {seriesResults.length} episódios
              </Button>
            </div>
          )}

          {/* Results */}
          {seriesResults.length > 0 && (
            <div className="premium-card max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-border/30">
                {seriesResults.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2 text-sm">
                    {r.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                     r.status === 'error' ? <XCircle className="w-4 h-4 text-destructive" /> :
                     <div className="w-4 h-4 rounded-full bg-muted" />}
                    <span className="font-mono text-xs text-muted-foreground">T{String(r.season).padStart(2,'0')}E{String(r.episode).padStart(2,'0')}</span>
                    <span className="flex-1 truncate text-xs text-muted-foreground">{r.url.split('vid=')[1]}</span>
                    <span className={cn('text-xs capitalize',
                      r.status === 'success' && 'text-green-500',
                      r.status === 'error' && 'text-destructive'
                    )}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* MOVIE TAB */}
        <TabsContent value="movie" className="space-y-4">
          <div className="premium-card p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Filme</Label>
                <Input
                  placeholder="Ex: Interstellar"
                  value={movieTitle}
                  onChange={e => setMovieTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Abreviação (RedeCanais)</Label>
                <Input
                  placeholder="Ex: INTRSTLLR"
                  value={movieAbbreviation}
                  onChange={e => setMovieAbbreviation(e.target.value.toUpperCase())}
                  className="uppercase font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
              <p>URL gerada: <code className="text-primary">{PLAYER_BASE}{movieAbbreviation || 'ABREV'}</code></p>
            </div>

            <Button
              onClick={handleImportMovie}
              disabled={!movieTitle.trim() || !movieAbbreviation.trim() || isImportingMovie}
              className="gap-2"
            >
              {isImportingMovie ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
              Importar Filme
            </Button>
          </div>

          {movieResults.length > 0 && (
            <div className="premium-card p-4">
              {movieResults.map((r, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  {r.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <span>{r.title}</span>
                  <span className="text-muted-foreground text-xs font-mono">{r.abbreviation}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DOMAINS TAB */}
        <TabsContent value="domains" className="space-y-4">
          <div className="premium-card p-5 space-y-4">
            <div>
              <h3 className="font-heading font-bold">Atualizar Domínios em Massa</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Troca o domínio de todas as URLs de filmes e episódios de uma vez
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Domínio Atual</Label>
                <Input
                  placeholder="Ex: redecanais.cafe"
                  value={oldDomain}
                  onChange={e => setOldDomain(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Novo Domínio</Label>
                <Input
                  placeholder="Ex: redecanais.ooo"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-destructive/10 text-xs text-destructive">
              ⚠️ Esta ação altera TODAS as URLs que contenham o domínio antigo. Não pode ser desfeita facilmente.
            </div>

            <Button
              onClick={handleUpdateDomains}
              disabled={!oldDomain.trim() || !newDomain.trim() || isUpdating}
              variant="destructive"
              className="gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Atualizar Todos os Domínios
            </Button>

            {updateStats && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
                <p className="text-green-500 font-medium">✅ Atualização concluída!</p>
                <p className="text-muted-foreground mt-1">
                  {updateStats.movies} filme(s) e {updateStats.episodes} episódio(s) atualizados
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
