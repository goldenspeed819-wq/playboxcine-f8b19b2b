import { useEffect, useMemo, useState } from 'react';
import { Tv, Film, Loader2, CheckCircle, XCircle, RefreshCw, Search, Link2, PlaySquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import IframePlayer from '@/components/IframePlayer';
import { useResolvedEmbedUrl } from '@/hooks/useResolvedEmbedUrl';
import { getSourceType } from '@/utils/videoSource';

const DEFAULT_PLAYER_TEMPLATE = 'https://{DOMAIN}/player3/server.php?server=RCServer{SERVER}&subfolder=ondemand&vid={VID}';

const sanitizeDomain = (value: string) => value.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');

const buildPlayerUrl = (template: string, domain: string, serverNum: string, vid: string) => {
  const safeTemplate = template.trim() || DEFAULT_PLAYER_TEMPLATE;
  return safeTemplate
    .replace(/\{DOMAIN\}/g, sanitizeDomain(domain) || 'redecanais.cafe')
    .replace(/\{SERVER\}/g, serverNum.trim() || '21')
    .replace(/\{VID\}/g, vid.trim());
};

const buildSeriesVid = (abbreviation: string, season: number, episode: number) => {
  const seasonStr = String(season).padStart(2, '0');
  const episodeStr = String(episode).padStart(2, '0');
  return `${abbreviation.toUpperCase()}RT${seasonStr}EP${episodeStr}`;
};

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

interface TmdbSeriesInfo {
  seasons: { season_number: number; episode_count: number }[];
  name: string;
  overview: string;
  poster: string;
  year: string;
  genres: string[];
}

function PreviewPlayer({
  title,
  inputValue,
  onInputChange,
  resolvedUrl,
  isLoading,
  error,
}: {
  title: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  resolvedUrl: string | null;
  isLoading: boolean;
  error: string | null;
}) {
  const previewUrl = resolvedUrl || inputValue;
  const sourceType = previewUrl ? getSourceType(previewUrl) : 'unknown';

  return (
    <div className="premium-card p-5 space-y-4">
      <div className="space-y-2">
        <Label>{title}</Label>
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="font-mono text-xs"
          placeholder="Cole ou ajuste a URL do preview"
        />
        <p className="text-xs text-muted-foreground break-all">
          Preview resolvido: <code className="text-primary">{previewUrl || 'aguardando URL...'}</code>
        </p>
      </div>

      {isLoading ? (
        <div className="aspect-video rounded-xl border border-border bg-card flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando preview...
          </div>
        </div>
      ) : error ? (
        <div className="aspect-video rounded-xl border border-border bg-card flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium">Não foi possível montar o embed automaticamente.</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : previewUrl ? (
        sourceType === 'video' ? (
          <div className="aspect-video overflow-hidden rounded-xl border border-border bg-card">
            <video src={previewUrl} controls className="w-full h-full bg-black object-contain" />
          </div>
        ) : (
          <IframePlayer src={previewUrl} originalUrl={inputValue} />
        )
      ) : null}
    </div>
  );
}

export default function QuickImport() {
  const { toast } = useToast();

  const [playerDomain, setPlayerDomain] = useState('redecanais.cafe');
  const [serverNum, setServerNum] = useState('21');
  const [playerUrlTemplate, setPlayerUrlTemplate] = useState(DEFAULT_PLAYER_TEMPLATE);

  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesAbbreviation, setSeriesAbbreviation] = useState('');
  const [seriesResults, setSeriesResults] = useState<SeriesImportResult[]>([]);
  const [isImportingSeries, setIsImportingSeries] = useState(false);
  const [tmdbInfo, setTmdbInfo] = useState<TmdbSeriesInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [seriesPreviewSeason, setSeriesPreviewSeason] = useState('1');
  const [seriesPreviewEpisode, setSeriesPreviewEpisode] = useState('1');
  const [seriesPreviewUrl, setSeriesPreviewUrl] = useState('');

  const [movieTitle, setMovieTitle] = useState('');
  const [movieAbbreviation, setMovieAbbreviation] = useState('');
  const [movieResults, setMovieResults] = useState<MovieImportResult[]>([]);
  const [isImportingMovie, setIsImportingMovie] = useState(false);
  const [moviePreviewUrl, setMoviePreviewUrl] = useState('');

  const [oldDomain, setOldDomain] = useState('redecanais.cafe');
  const [newDomain, setNewDomain] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStats, setUpdateStats] = useState<{ movies: number; episodes: number } | null>(null);

  const seriesPreviewVid = useMemo(() => {
    if (!seriesAbbreviation.trim()) return '';
    return buildSeriesVid(
      seriesAbbreviation,
      Number(seriesPreviewSeason) || 1,
      Number(seriesPreviewEpisode) || 1,
    );
  }, [seriesAbbreviation, seriesPreviewSeason, seriesPreviewEpisode]);

  const defaultSeriesPreviewUrl = useMemo(() => {
    if (!seriesPreviewVid) return '';
    return buildPlayerUrl(playerUrlTemplate, playerDomain, serverNum, seriesPreviewVid);
  }, [playerUrlTemplate, playerDomain, serverNum, seriesPreviewVid]);

  const generatedMovieUrl = useMemo(() => {
    if (!movieAbbreviation.trim()) return '';
    return buildPlayerUrl(playerUrlTemplate, playerDomain, serverNum, movieAbbreviation.toUpperCase());
  }, [playerUrlTemplate, playerDomain, serverNum, movieAbbreviation]);

  const effectiveSeriesPreviewUrl = seriesPreviewUrl.trim() || defaultSeriesPreviewUrl;
  const effectiveMoviePreviewUrl = moviePreviewUrl.trim() || generatedMovieUrl;

  const seriesPreviewState = useResolvedEmbedUrl(effectiveSeriesPreviewUrl);
  const moviePreviewState = useResolvedEmbedUrl(effectiveMoviePreviewUrl);

  useEffect(() => {
    if (!tmdbInfo || !seriesAbbreviation.trim()) {
      setSeriesResults([]);
      return;
    }

    const results: SeriesImportResult[] = [];
    for (const season of tmdbInfo.seasons) {
      for (let ep = 1; ep <= season.episode_count; ep++) {
        const vid = buildSeriesVid(seriesAbbreviation, season.season_number, ep);
        results.push({
          season: season.season_number,
          episode: ep,
          url: buildPlayerUrl(playerUrlTemplate, playerDomain, serverNum, vid),
          status: 'pending',
        });
      }
    }

    setSeriesResults(results);
  }, [tmdbInfo, seriesAbbreviation, playerUrlTemplate, playerDomain, serverNum]);

  useEffect(() => {
    if (!moviePreviewUrl.trim()) return;
    if (moviePreviewUrl !== generatedMovieUrl && movieAbbreviation.trim()) return;
    setMoviePreviewUrl(generatedMovieUrl);
  }, [generatedMovieUrl, moviePreviewUrl, movieAbbreviation]);

  const handleSearchTMDB = async () => {
    if (!seriesTitle.trim() || !seriesAbbreviation.trim()) return;
    setIsSearching(true);
    setTmdbInfo(null);
    setSeriesResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('tmdb-search', {
        body: { action: 'search', query: seriesTitle, type: 'tv' },
      });

      if (error) throw error;
      if (!data?.results?.length) {
        toast({ title: 'Série não encontrada no TMDB', variant: 'destructive' });
        return;
      }

      const show = data.results[0];
      const { data: detailData, error: detailError } = await supabase.functions.invoke('tmdb-search', {
        body: { action: 'details', id: show.id, type: 'tv' },
      });

      if (detailError) throw detailError;

      const seasons = (detailData?.seasons || [])
        .filter((season: { season_number: number; episode_count: number }) => season.season_number > 0 && season.episode_count > 0)
        .map((season: { season_number: number; episode_count: number }) => ({
          season_number: season.season_number,
          episode_count: season.episode_count,
        }));

      if (!seasons.length) {
        toast({ title: 'TMDB sem episódios disponíveis', variant: 'destructive' });
        return;
      }

      setTmdbInfo({
        seasons,
        name: detailData?.title || show.title || seriesTitle,
        overview: detailData?.overview || show.overview || '',
        poster: detailData?.posterUrl || show.posterUrl || '',
        year: detailData?.releaseYear ? String(detailData.releaseYear) : '',
        genres: detailData?.genres || show.genres || [],
      });
      setSeriesPreviewSeason(String(seasons[0].season_number));
      setSeriesPreviewEpisode('1');
      setSeriesPreviewUrl('');

      const totalEpisodes = seasons.reduce((sum: number, season: { episode_count: number }) => sum + season.episode_count, 0);
      toast({
        title: detailData?.title || show.title,
        description: `${seasons.length} temporada(s), ${totalEpisodes} episódio(s) detectados`,
      });
    } catch (e) {
      toast({ title: 'Erro ao buscar no TMDB', description: String(e), variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportSeries = async () => {
    if (!tmdbInfo || seriesResults.length === 0 || !seriesAbbreviation.trim()) return;
    setIsImportingSeries(true);

    try {
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .insert({
          title: tmdbInfo.name,
          description: tmdbInfo.overview,
          thumbnail: tmdbInfo.poster,
          release_year: tmdbInfo.year ? parseInt(tmdbInfo.year, 10) : null,
          category: tmdbInfo.genres.join(', '),
          rating: 'Livre',
        })
        .select()
        .single();

      if (seriesError) throw seriesError;

      const batchSize = 20;
      const updatedResults = [...seriesResults];

      for (let i = 0; i < seriesResults.length; i += batchSize) {
        const batch = seriesResults.slice(i, i + batchSize);
        const episodes = batch.map((item) => ({
          series_id: seriesData.id,
          season: item.season,
          episode: item.episode,
          video_url: item.url,
          title: `Episódio ${item.episode}`,
        }));

        const { error } = await supabase.from('episodes').insert(episodes);

        batch.forEach((_, index) => {
          updatedResults[i + index] = {
            ...updatedResults[i + index],
            status: error ? 'error' : 'success',
          };
        });

        setSeriesResults([...updatedResults]);
      }

      const successCount = updatedResults.filter((item) => item.status === 'success').length;
      toast({ title: 'Série importada!', description: `${tmdbInfo.name} com ${successCount} episódios` });
    } catch (e) {
      toast({ title: 'Erro na importação', description: String(e), variant: 'destructive' });
    } finally {
      setIsImportingSeries(false);
    }
  };

  const handleImportMovie = async () => {
    if (!movieTitle.trim() || !movieAbbreviation.trim()) return;
    setIsImportingMovie(true);

    const vid = movieAbbreviation.toUpperCase();
    const url = generatedMovieUrl;

    try {
      let metadata: any = { title: movieTitle };

      try {
        const { data, error } = await supabase.functions.invoke('tmdb-search', {
          body: { action: 'search', query: movieTitle, type: 'movie' },
        });

        if (error) throw error;

        if (data?.results?.length > 0) {
          const movie = data.results[0];
          metadata = {
            title: movie.title || movieTitle,
            description: movie.overview || '',
            thumbnail: movie.posterUrl || '',
            release_year: movie.releaseYear || null,
            category: (movie.genres || []).join(', '),
            rating: 'Livre',
          };
        }
      } catch {
        // segue sem enriquecer se o TMDB falhar
      }

      const payload: any = {
        ...metadata,
        video_url: url,
      };

      const { error } = await supabase.from('movies').insert(payload);

      if (error) throw error;

      setMovieResults([{ title: String(metadata.title || movieTitle), abbreviation: vid, url, status: 'success' }]);
      toast({ title: 'Filme importado!', description: String(metadata.title || movieTitle) });
    } catch (e) {
      setMovieResults([{ title: movieTitle, abbreviation: vid, url, status: 'error' }]);
      toast({ title: 'Erro ao importar filme', description: String(e), variant: 'destructive' });
    } finally {
      setIsImportingMovie(false);
    }
  };

  const handleUpdateDomains = async () => {
    if (!oldDomain.trim() || !newDomain.trim()) return;
    setIsUpdating(true);
    setUpdateStats(null);

    try {
      const { data: movies } = await supabase.from('movies').select('id, video_url, video_url_part2');
      let movieCount = 0;

      if (movies) {
        for (const movie of movies) {
          const updates: Record<string, string> = {};
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

      const { data: episodes } = await supabase.from('episodes').select('id, video_url');
      let episodeCount = 0;

      if (episodes) {
        for (const episode of episodes) {
          if (episode.video_url?.includes(oldDomain)) {
            const updatedUrl = episode.video_url.replace(new RegExp(oldDomain.replace('.', '\\.'), 'g'), newDomain);
            await supabase.from('episodes').update({ video_url: updatedUrl }).eq('id', episode.id);
            episodeCount++;
          }
        }
      }

      setUpdateStats({ movies: movieCount, episodes: episodeCount });
      toast({
        title: 'Domínios atualizados!',
        description: `${movieCount} filme(s) e ${episodeCount} episódio(s) atualizados`,
      });
    } catch (e) {
      toast({ title: 'Erro ao atualizar domínios', description: String(e), variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Importação Rápida</h1>
        <p className="text-muted-foreground mt-1">Adicione conteúdo por abreviação, ajuste a URL do player e valide o preview antes de importar.</p>
      </div>

      <div className="premium-card p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[220px_140px_1fr] gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Domínio do Player</Label>
            <Input
              value={playerDomain}
              onChange={(e) => setPlayerDomain(e.target.value)}
              className="font-mono text-sm"
              placeholder="redecanais.cafe"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nº do Server</Label>
            <Input
              value={serverNum}
              onChange={(e) => setServerNum(e.target.value)}
              className="font-mono text-sm"
              placeholder="21"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Template da URL</Label>
            <Input
              value={playerUrlTemplate}
              onChange={(e) => setPlayerUrlTemplate(e.target.value)}
              className="font-mono text-xs"
              placeholder={DEFAULT_PLAYER_TEMPLATE}
            />
            <p className="text-[11px] text-muted-foreground">
              Use <code>{'{DOMAIN}'}</code>, <code>{'{SERVER}'}</code> e <code>{'{VID}'}</code>.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground break-all">
          Exemplo final: <code className="text-primary">{buildPlayerUrl(playerUrlTemplate, playerDomain, serverNum, seriesPreviewVid || movieAbbreviation.toUpperCase() || 'ABREVRT01EP01')}</code>
        </div>
      </div>

      <Tabs defaultValue="series" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="series" className="gap-2"><Tv className="w-4 h-4" /> Série</TabsTrigger>
          <TabsTrigger value="movie" className="gap-2"><Film className="w-4 h-4" /> Filme</TabsTrigger>
          <TabsTrigger value="domains" className="gap-2"><Link2 className="w-4 h-4" /> Domínios</TabsTrigger>
        </TabsList>

        <TabsContent value="series" className="space-y-4">
          <div className="premium-card p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Série</Label>
                <Input
                  placeholder="Ex: One Piece - Live Action"
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Abreviação (RedeCanais)</Label>
                <Input
                  placeholder="Ex: ONPCEAS"
                  value={seriesAbbreviation}
                  onChange={(e) => setSeriesAbbreviation(e.target.value.toUpperCase())}
                  className="uppercase font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Como funciona:</p>
              <p>• O padrão gerado será: <code className="text-primary">{seriesAbbreviation || 'ABREV'}RT01EP01</code></p>
              <p>• O backend consulta o TMDB para descobrir temporadas e episódios</p>
              <p>• Você pode alterar a URL do preview antes de importar</p>
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

          {tmdbInfo && (
            <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-4">
              <div className="space-y-4">
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
                        {tmdbInfo.seasons.map((season) => (
                          <span key={season.season_number} className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
                            T{season.season_number}: {season.episode_count} eps
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Episódio do preview</Label>
                      <Input
                        type="number"
                        min="1"
                        value={seriesPreviewEpisode}
                        onChange={(e) => setSeriesPreviewEpisode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temporada do preview</Label>
                      <Input
                        type="number"
                        min="1"
                        value={seriesPreviewSeason}
                        onChange={(e) => setSeriesPreviewSeason(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 lg:col-span-1 flex items-end">
                      <div className="w-full rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                        VID atual: <code className="text-primary">{seriesPreviewVid || 'ABREVRT01EP01'}</code>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleImportSeries} disabled={isImportingSeries} className="gap-2 w-full">
                    {isImportingSeries ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Importar {seriesResults.length} episódios
                  </Button>
                </div>

                {seriesResults.length > 0 && (
                  <div className="premium-card max-h-[420px] overflow-y-auto">
                    <div className="divide-y divide-border/30">
                      {seriesResults.map((result, index) => (
                        <div key={index} className="flex items-center gap-3 px-4 py-2 text-sm">
                          {result.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                           result.status === 'error' ? <XCircle className="w-4 h-4 text-destructive" /> :
                           <div className="w-4 h-4 rounded-full bg-muted" />}
                          <span className="font-mono text-xs text-muted-foreground">T{String(result.season).padStart(2, '0')}E{String(result.episode).padStart(2, '0')}</span>
                          <span className="flex-1 truncate text-xs text-muted-foreground">{result.url}</span>
                          <span
                            className={cn(
                              'text-xs capitalize',
                              result.status === 'success' && 'text-green-500',
                              result.status === 'error' && 'text-destructive',
                            )}
                          >
                            {result.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <PreviewPlayer
                title="Preview do episódio"
                inputValue={effectiveSeriesPreviewUrl}
                onInputChange={setSeriesPreviewUrl}
                resolvedUrl={seriesPreviewState.url}
                isLoading={seriesPreviewState.isLoading}
                error={seriesPreviewState.error}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="movie" className="space-y-4">
          <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-4">
            <div className="space-y-4">
              <div className="premium-card p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Filme</Label>
                    <Input
                      placeholder="Ex: Interstellar"
                      value={movieTitle}
                      onChange={(e) => setMovieTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Abreviação (RedeCanais)</Label>
                    <Input
                      placeholder="Ex: INTRSTLLR"
                      value={movieAbbreviation}
                      onChange={(e) => setMovieAbbreviation(e.target.value.toUpperCase())}
                      className="uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
                  URL gerada: <code className="text-primary">{generatedMovieUrl || 'preencha a abreviação para gerar a URL'}</code>
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
                <div className="premium-card p-4 space-y-3">
                  {movieResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      {result.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      <span>{result.title}</span>
                      <span className="text-muted-foreground text-xs font-mono">{result.abbreviation}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <PreviewPlayer
              title="Preview do filme"
              inputValue={effectiveMoviePreviewUrl}
              onInputChange={setMoviePreviewUrl}
              resolvedUrl={moviePreviewState.url}
              isLoading={moviePreviewState.isLoading}
              error={moviePreviewState.error}
            />
          </div>
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <div className="premium-card p-5 space-y-4">
            <div>
              <h3 className="font-heading font-bold">Atualizar Domínios em Massa</h3>
              <p className="text-sm text-muted-foreground mt-1">Troca o domínio de todas as URLs de filmes e episódios de uma vez.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Domínio Atual</Label>
                <Input placeholder="Ex: redecanais.cafe" value={oldDomain} onChange={(e) => setOldDomain(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Novo Domínio</Label>
                <Input placeholder="Ex: redecanais.ooo" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
              </div>
            </div>

            <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              ⚠️ Esta ação altera todas as URLs que contenham o domínio antigo.
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
              <div className="rounded-xl border border-border bg-card p-4 text-sm">
                <p className="font-medium flex items-center gap-2"><PlaySquare className="w-4 h-4 text-primary" /> Atualização concluída</p>
                <p className="text-muted-foreground mt-1">{updateStats.movies} filme(s) e {updateStats.episodes} episódio(s) atualizados.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
