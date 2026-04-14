import { useState } from 'react';
import { Upload, Film, Tv, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ExternalMovie {
  titulo: string;
  tmdb_url: string | null;
  url_pagina: string;
  video_links: string[];
}

interface ExternalSeries {
  titulo: string;
  tmdb_url: string | null;
  url_pagina: string;
  episodios: any[];
}

// Scraper format
interface ScraperResult {
  url: string;
  title: string;
  thumb?: string;
  description?: string;
  videos: { url: string; type: string }[];
}

interface ExternalJson {
  filmes?: ExternalMovie[];
  series?: ExternalSeries[];
  results?: ScraperResult[];
  total_itens?: number;
  data_extracao?: string;
}

interface ImportItem {
  type: 'movie' | 'series';
  titulo: string;
  videoUrl: string | null;
  status: 'pending' | 'importing' | 'success' | 'error';
  error?: string;
}

function pickBestUrl(links: string[]): string | null {
  if (!links || links.length === 0) return null;
  const master = links.find(l => l.includes('master.m3u8'));
  return master || links[0];
}

function pickBestUrlFromVideos(videos: { url: string; type: string }[]): string | null {
  if (!videos || videos.length === 0) return null;
  // Prefer HLS master, then any HLS, skip TS segments, blob:, and page URLs
  const validVideos = videos.filter(v =>
    v.url.startsWith('https://') &&
    !v.url.includes('/seg-') &&
    !v.url.startsWith('blob:') &&
    v.type !== 'TS'
  );
  const master = validVideos.find(v => v.url.includes('master.m3u8'));
  if (master) return master.url;
  const hls = validVideos.find(v => v.type === 'HLS');
  if (hls) return hls.url;
  return null;
}

function extractYear(titulo: string): number | null {
  const match = titulo.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

function cleanTitle(titulo: string): string {
  // Remove year from end and capitalize
  return titulo
    .replace(/\s*\b(19|20)\d{2}\b\s*$/, '')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
}

const ExternalJsonImport = () => {
  const { toast } = useToast();
  const [jsonText, setJsonText] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState(false);

  const handleParse = () => {
    try {
      const data: ExternalJson = JSON.parse(jsonText);
      const parsedItems: ImportItem[] = [];

      // Format 1: { filmes: [...], series: [...] }
      if (data.filmes) {
        for (const f of data.filmes) {
          const url = pickBestUrl(f.video_links);
          parsedItems.push({
            type: 'movie', titulo: f.titulo, videoUrl: url, thumbnail: null, description: null,
            status: url ? 'pending' : 'error', error: url ? undefined : 'Sem link de vídeo',
          });
        }
      }
      if (data.series) {
        for (const s of data.series) {
          parsedItems.push({ type: 'series', titulo: s.titulo, videoUrl: null, thumbnail: null, description: null, status: 'pending' });
        }
      }

      // Format 2: { results: [...] } (scraper format)
      if (data.results) {
        for (const r of data.results) {
          const url = pickBestUrlFromVideos(r.videos);
          parsedItems.push({
            type: 'movie', titulo: r.title, videoUrl: url,
            thumbnail: r.thumb || null, description: r.description || null,
            status: 'pending',
          });
        }
      }

      setItems(parsedItems);
      setParsed(true);
      const movies = parsedItems.filter(i => i.type === 'movie').length;
      const series = parsedItems.filter(i => i.type === 'series').length;
      toast({ title: `${parsedItems.length} itens encontrados`, description: `${movies} filmes, ${series} séries` });
    } catch {
      toast({ title: 'JSON inválido', variant: 'destructive' });
    }
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    setImporting(true);
    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.status === 'success' || item.status === 'error') continue;

      updated[i] = { ...item, status: 'importing' };
      setItems([...updated]);

      try {
        const title = cleanTitle(item.titulo);
        const year = extractYear(item.titulo);

        if (item.type === 'movie') {
          const { error } = await supabase.from('movies').insert({
            title,
            video_url: item.videoUrl,
            release_year: year,
            rating: 'Livre',
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('series').insert({
            title,
            release_year: year,
            rating: 'Livre',
          });
          if (error) throw error;
        }

        updated[i] = { ...item, status: 'success' };
      } catch (e: any) {
        updated[i] = { ...item, status: 'error', error: e.message };
      }

      setItems([...updated]);
    }

    setImporting(false);
    const success = updated.filter(i => i.status === 'success').length;
    toast({ title: `Importação concluída`, description: `${success}/${updated.length} importados com sucesso` });
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const movieCount = items.filter(i => i.type === 'movie').length;
  const seriesCount = items.filter(i => i.type === 'series').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar JSON Externo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cole o JSON extraído de sites externos. Filmes com URLs HLS serão importados com player nativo.
        </p>
      </div>

      {!parsed ? (
        <div className="space-y-4">
          <Textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='Cole aqui o JSON com "filmes" e "series"...'
            className="min-h-[300px] font-mono text-xs"
          />
          <Button onClick={handleParse} disabled={!jsonText.trim()} className="gap-2">
            <Upload className="w-4 h-4" />
            Analisar JSON
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex gap-4 flex-wrap">
            <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm">
              <Film className="w-4 h-4 inline mr-1" /> {movieCount} filmes
            </div>
            <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm">
              <Tv className="w-4 h-4 inline mr-1" /> {seriesCount} séries
            </div>
            {successCount > 0 && (
              <div className="bg-green-500/10 text-green-400 rounded-lg px-4 py-2 text-sm">
                <CheckCircle className="w-4 h-4 inline mr-1" /> {successCount} ok
              </div>
            )}
            {errorCount > 0 && (
              <div className="bg-red-500/10 text-red-400 rounded-lg px-4 py-2 text-sm">
                <XCircle className="w-4 h-4 inline mr-1" /> {errorCount} erros
              </div>
            )}
          </div>

          {/* Items list */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {items.map((item, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  item.status === 'success' && 'border-green-500/30 bg-green-500/5',
                  item.status === 'error' && 'border-red-500/30 bg-red-500/5',
                  item.status === 'importing' && 'border-primary/30 bg-primary/5',
                  item.status === 'pending' && 'border-border bg-card',
                )}
              >
                {item.type === 'movie' ? (
                  <Film className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <Tv className="w-4 h-4 text-purple-400 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cleanTitle(item.titulo)}</p>
                  {item.videoUrl && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.videoUrl.substring(0, 60)}...
                    </p>
                  )}
                  {item.error && <p className="text-xs text-red-400">{item.error}</p>}
                </div>

                {item.status === 'importing' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {item.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                {item.status === 'pending' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={importing || pendingCount === 0} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar {pendingCount} itens
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setParsed(false);
                setItems([]);
                setJsonText('');
              }}
            >
              Novo JSON
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalJsonImport;
