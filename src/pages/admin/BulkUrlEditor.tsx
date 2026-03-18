import { useEffect, useState } from 'react';
import { Search, RefreshCw, Loader2, CheckCircle, Film, Tv, Filter, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type ContentType = 'all' | 'movies' | 'series';
type EpisodeFormat = '2' | '3'; // 01 or 001

interface UrlRecord {
  id: string;
  type: 'movie' | 'episode';
  label: string;
  season?: number;
  episode?: number;
  series_title?: string;
  video_url: string | null;
  video_url_part2?: string | null;
}

interface SeriesOption {
  id: string;
  title: string;
}

export default function BulkUrlEditor() {
  const { toast } = useToast();

  const [contentType, setContentType] = useState<ContentType>('all');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [records, setRecords] = useState<UrlRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Find & Replace
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceStats, setReplaceStats] = useState<{ count: number } | null>(null);
  const [episodeFormat, setEpisodeFormat] = useState<EpisodeFormat>('2');

  // Reformat episode numbers
  const [isReformatting, setIsReformatting] = useState(false);
  // Load series list
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('series').select('id, title').order('title');
      if (data) setSeriesOptions(data);
    })();
  }, []);

  // Load seasons when series selected
  useEffect(() => {
    if (!selectedSeries || selectedSeries === 'all') {
      setSeasons([]);
      setSelectedSeason('all');
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('episodes')
        .select('season')
        .eq('series_id', selectedSeries)
        .order('season');
      if (data) {
        const unique = [...new Set(data.map((e) => e.season))];
        setSeasons(unique);
      }
    })();
  }, [selectedSeries]);

  const handleSearch = async () => {
    setIsLoading(true);
    setRecords([]);
    setReplaceStats(null);

    try {
      const results: UrlRecord[] = [];

      if (contentType !== 'series') {
        let query = supabase.from('movies').select('id, title, video_url, video_url_part2');
        if (searchText.trim()) query = query.ilike('title', `%${searchText}%`);
        const { data } = await query.order('title').limit(500);
        if (data) {
          for (const m of data) {
            results.push({
              id: m.id,
              type: 'movie',
              label: m.title,
              video_url: m.video_url,
              video_url_part2: m.video_url_part2,
            });
          }
        }
      }

      if (contentType !== 'movies') {
        let query = supabase.from('episodes').select('id, season, episode, video_url, series_id, series(title)');
        if (selectedSeries && selectedSeries !== 'all') query = query.eq('series_id', selectedSeries);
        if (selectedSeason && selectedSeason !== 'all') query = query.eq('season', Number(selectedSeason));
        const { data } = await query.order('season').order('episode').limit(1000);
        if (data) {
          for (const ep of data) {
            const seriesTitle = (ep as any).series?.title || '';
            if (searchText.trim() && !seriesTitle.toLowerCase().includes(searchText.toLowerCase())) continue;
            results.push({
              id: ep.id,
              type: 'episode',
              label: `T${String(ep.season).padStart(2, '0')}E${String(ep.episode).padStart(2, '0')}`,
              season: ep.season,
              episode: ep.episode,
              series_title: seriesTitle,
              video_url: ep.video_url,
            });
          }
        }
      }

      setRecords(results);
      if (results.length === 0) {
        toast({ title: 'Nenhum resultado encontrado' });
      }
    } catch (e) {
      toast({ title: 'Erro ao buscar', description: String(e), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkReplace = async () => {
    if (!findText.trim()) return;
    setIsReplacing(true);
    setReplaceStats(null);

    try {
      let count = 0;
      const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedFind, 'g');

      for (const record of records) {
        const updates: Record<string, string> = {};

        if (record.video_url?.includes(findText)) {
          updates.video_url = record.video_url.replace(regex, replaceText);
        }
        if (record.type === 'movie' && record.video_url_part2?.includes(findText)) {
          updates.video_url_part2 = record.video_url_part2.replace(regex, replaceText);
        }

        if (Object.keys(updates).length > 0) {
          const table = record.type === 'movie' ? 'movies' : 'episodes';
          await supabase.from(table).update(updates).eq('id', record.id);
          count++;

          // Update local state
          if (updates.video_url) record.video_url = updates.video_url;
          if (updates.video_url_part2 && record.type === 'movie') record.video_url_part2 = updates.video_url_part2;
        }
      }

      setRecords([...records]);
      setReplaceStats({ count });
      toast({ title: 'Substituição concluída!', description: `${count} URL(s) atualizadas` });
    } catch (e) {
      toast({ title: 'Erro na substituição', description: String(e), variant: 'destructive' });
    } finally {
      setIsReplacing(false);
    }
  };

  const matchCount = findText.trim()
    ? records.filter((r) => r.video_url?.includes(findText) || (r.type === 'movie' && r.video_url_part2?.includes(findText))).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Editor de URLs em Massa</h1>
        <p className="text-muted-foreground mt-1">Busque, filtre e altere URLs de filmes e episódios de uma vez.</p>
      </div>

      {/* Filters */}
      <div className="premium-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" /> Filtros
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="movies">Filmes</SelectItem>
                <SelectItem value="series">Séries/Episódios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Série</Label>
            <Select value={selectedSeries} onValueChange={setSelectedSeries} disabled={contentType === 'movies'}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {seriesOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Temporada</Label>
            <Select value={selectedSeason} onValueChange={setSelectedSeason} disabled={!selectedSeries || selectedSeries === 'all'}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {seasons.map((s) => (
                  <SelectItem key={s} value={String(s)}>Temporada {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Buscar por nome</Label>
            <Input
              placeholder="Título..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar URLs ({records.length})
        </Button>
      </div>

      {/* Find & Replace */}
      {records.length > 0 && (
        <div className="premium-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Buscar e Substituir
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Encontrar</Label>
              <Input
                placeholder="Ex: redecanais.cafe"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Substituir por</Label>
              <Input
                placeholder="Ex: redecanais.ooo"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          {findText.trim() && (
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">{matchCount}</span> URL(s) contêm "{findText}"
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleBulkReplace}
              disabled={!findText.trim() || matchCount === 0 || isReplacing}
              variant="destructive"
              className="gap-2"
            >
              {isReplacing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Substituir em {matchCount} URL(s)
            </Button>
          </div>

          {replaceStats && (
            <div className="rounded-xl border border-border bg-card p-3 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {replaceStats.count} URL(s) atualizadas com sucesso.
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      {records.length > 0 && (
        <div className="premium-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-medium">
            {records.length} resultado(s)
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-border/30">
            {records.map((record) => (
              <div key={`${record.type}-${record.id}`} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-muted/30">
                <div className="shrink-0 mt-0.5">
                  {record.type === 'movie' ? (
                    <Film className="w-4 h-4 text-primary" />
                  ) : (
                    <Tv className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">
                      {record.type === 'episode' ? record.series_title : record.label}
                    </span>
                    {record.type === 'episode' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {record.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono break-all mt-0.5">
                    {record.video_url || '(sem URL)'}
                  </p>
                  {record.type === 'movie' && record.video_url_part2 && (
                    <p className="text-xs text-muted-foreground/70 font-mono break-all">
                      Parte 2: {record.video_url_part2}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
