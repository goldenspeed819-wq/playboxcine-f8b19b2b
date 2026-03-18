import { useState, useRef } from 'react';
import { Upload, Play, CheckCircle, XCircle, AlertCircle, Loader2, FileJson, Zap, Search, Clapperboard, Tv, FolderOpen, ShieldCheck, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ContentType = 'movie' | 'series';

interface ParsedItem {
  title: string;
  year: string;
  embed_url: string;
  content_type: ContentType;
  status?: 'pending' | 'processing' | 'added' | 'exists' | 'not_found' | 'error' | 'valid' | 'invalid';
  tmdbTitle?: string;
  fileName?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BATCH_SIZE = 5;
const PLAYER_BASE = 'https://redecanais.cafe/player3/server.php?server=RCServer26&subfolder=ondemand&vid=';

const URL_CLEANUP_TOKENS = new Set([
  'dublado', 'legendado', 'nacional', 'dual', 'audio', 'dual-audio', 'filme', 'ova',
]);

function titleToVid(title: string): string {
  let t = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/e/g, '');
  t = t.replace(/[^A-Za-z0-9]/g, '');
  return t.toUpperCase();
}

function relativeUrlToVid(relativeUrl: string): string {
  if (!relativeUrl) return '';
  const rawPath = relativeUrl.replace(/^https?:\/\/[^/]+/i, '').replace(/^\//, '').replace(/\.html$/i, '').replace(/_[a-f0-9]+$/i, '');
  const cleanedSlug = rawPath.split('-').filter(Boolean).filter(t => !URL_CLEANUP_TOKENS.has(t.toLowerCase())).filter(t => !/^\d{4}$/.test(t)).filter(t => !/^\d{3,4}p$/i.test(t)).join(' ').trim();
  return titleToVid(cleanedSlug);
}

function cleanTitle(titulo: string, ano?: string): string {
  if (!titulo) return '';
  let t = titulo.trim();
  if (ano) {
    const regex = new RegExp(`(.+)${ano}\\d+min$`);
    const match = t.match(regex);
    if (match) return match[1].trim();
    const idx = t.lastIndexOf(ano);
    if (idx > 0) return t.substring(0, idx).trim();
  }
  return t;
}

function extractTitleFromFileName(fileName: string): { title: string; year: string; season?: number; episode?: number } {
  let name = fileName.replace(/\.(mp4|mkv|avi|ts|mts|webm|mov|wmv)$/i, '');
  
  // Extract S01E01 pattern for series
  const seMatch = name.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
  let season: number | undefined;
  let episode: number | undefined;
  if (seMatch) {
    season = parseInt(seMatch[1]);
    episode = parseInt(seMatch[2]);
    name = name.replace(seMatch[0], '');
  }

  // Extract year
  const yearMatch = name.match(/[\.\s\-_\(]?((?:19|20)\d{2})[\.\s\-_\)]?/);
  const year = yearMatch ? yearMatch[1] : '';
  if (yearMatch) name = name.replace(yearMatch[0], '');

  // Clean quality/codec tags
  name = name.replace(/[\.\-_](720p|1080p|2160p|4k|x264|x265|h264|h265|hevc|aac|dts|bluray|brrip|hdrip|webrip|web-dl|dvdrip|hdtv|remux|dual|dublado|legendado|nacional)/gi, '');
  name = name.replace(/[\.\-_]/g, ' ').replace(/\s+/g, ' ').trim();

  return { title: name, year, season, episode };
}

function parseJSON(raw: string, forcedType: ContentType): ParsedItem[] {
  const data = JSON.parse(raw);
  const items: ParsedItem[] = [];

  if (Array.isArray(data)) {
    for (const entry of data) {
      const titulo = (entry.titulo || '').trim();
      const ano = entry.ano ? String(entry.ano) : '';
      const relativeUrl = (entry.url || '').trim();

      if (!relativeUrl && !titulo) continue;

      let title = titulo;
      if (!title) {
        const slug = relativeUrl.replace(/\.html$/, '').replace(/_[a-f0-9]+$/, '').replace(/^\//, '');
        const cleaned = slug.replace(/-(dublado|legendado|nacional|dual-audio)/gi, '').replace(/-\d{4}/, '').replace(/-\d{3,4}p/, '').replace(/-/g, ' ').trim();
        title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }

      title = cleanTitle(title, ano);
      if (!title) continue;

      const vid = relativeUrlToVid(relativeUrl) || titleToVid(title);
      const embed_url = vid ? `${PLAYER_BASE}${vid}` : '';

      // Detect type from JSON if mixed mode
      const itemType = entry.type || entry.tipo;
      const detectedType: ContentType = itemType === 'serie' || itemType === 'series' || itemType === 'tv' 
        ? 'series' 
        : itemType === 'movie' || itemType === 'filme' 
          ? 'movie' 
          : forcedType;

      items.push({ title, year: ano, embed_url, content_type: detectedType, status: 'pending' });
    }
    return items;
  }

  if (typeof data === 'object' && data !== null) {
    for (const key of Object.keys(data)) {
      const entry = data[key];
      if (!entry.titulo && !entry.title) continue;

      const title = cleanTitle(entry.titulo || entry.title, entry.ano);
      let embed_url = entry.embed_url || '';
      if (!embed_url && entry.players) {
        for (const provider of Object.keys(entry.players)) {
          const players = entry.players[provider];
          if (Array.isArray(players) && players.length > 0 && players[0].embed_url) {
            embed_url = players[0].embed_url;
            break;
          }
        }
      }

      items.push({ title, year: entry.ano || '', embed_url, content_type: forcedType, status: 'pending' });
    }
  }

  return items;
}

export default function BulkImport() {
  const { toast } = useToast();
  const [jsonText, setJsonText] = useState('');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [stats, setStats] = useState({ added: 0, exists: 0, notFound: 0, errors: 0 });
  const [skipTmdb, setSkipTmdb] = useState(true);
  const [contentType, setContentType] = useState<ContentType>('movie');
  const [validationStats, setValidationStats] = useState({ valid: 0, invalid: 0, total: 0 });
  const abortRef = useRef(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    try {
      const parsed = parseJSON(jsonText, contentType);
      if (parsed.length === 0) {
        toast({ title: 'Nenhum item encontrado no JSON', variant: 'destructive' });
        return;
      }
      setItems(parsed);
      setProcessed(0);
      setStats({ added: 0, exists: 0, notFound: 0, errors: 0 });
      setValidationStats({ valid: 0, invalid: 0, total: 0 });
      toast({ title: `${parsed.length} itens detectados` });
    } catch (e) {
      toast({ title: 'JSON inválido', description: String(e), variant: 'destructive' });
    }
  };

  const handleLoadBuiltIn = async () => {
    try {
      const res = await fetch('/data/filmes.json');
      const text = await res.text();
      setJsonText(text);
      toast({ title: 'Arquivo carregado', description: 'Clique em "Analisar JSON" para continuar.' });
    } catch {
      toast({ title: 'Erro ao carregar arquivo embutido', variant: 'destructive' });
    }
  };

  // FOLDER UPLOAD
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const videoExtensions = /\.(mp4|mkv|avi|ts|mts|webm|mov|wmv)$/i;
    const videoFiles = Array.from(files).filter(f => videoExtensions.test(f.name));

    if (videoFiles.length === 0) {
      toast({ title: 'Nenhum arquivo de vídeo encontrado na pasta', variant: 'destructive' });
      return;
    }

    const parsed: ParsedItem[] = videoFiles.map(f => {
      const { title, year, season, episode } = extractTitleFromFileName(f.name);
      const vid = titleToVid(title);
      const isEpisode = season !== undefined && episode !== undefined;
      
      return {
        title: isEpisode ? `${title} S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}` : title,
        year,
        embed_url: `${PLAYER_BASE}${vid}`,
        content_type: isEpisode ? 'series' as ContentType : contentType,
        status: 'pending' as const,
        fileName: f.name,
      };
    });

    setItems(parsed);
    setProcessed(0);
    setStats({ added: 0, exists: 0, notFound: 0, errors: 0 });
    setValidationStats({ valid: 0, invalid: 0, total: 0 });
    toast({ title: `${parsed.length} vídeos detectados na pasta` });
  };

  // BATCH VALIDATION
  const handleValidate = async () => {
    setIsValidating(true);
    abortRef.current = false;
    let valid = 0, invalid = 0;

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;

      const item = items[i];
      if (!item.embed_url) {
        setItems(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: 'invalid' };
          return next;
        });
        invalid++;
        continue;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch(item.embed_url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // no-cors always returns opaque, so we just check it didn't throw
        setItems(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: 'valid' };
          return next;
        });
        valid++;
      } catch {
        setItems(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: 'invalid' };
          return next;
        });
        invalid++;
      }

      setValidationStats({ valid, invalid, total: i + 1 });

      if (i % 10 === 0) await new Promise(r => setTimeout(r, 100));
    }

    setIsValidating(false);
    toast({ title: 'Validação concluída', description: `${valid} válidos, ${invalid} inválidos` });
  };

  const handleImport = async () => {
    setIsImporting(true);
    abortRef.current = false;
    let added = 0, exists = 0, notFound = 0, errors = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (abortRef.current) break;

      const batch = items.slice(i, i + BATCH_SIZE);

      setItems(prev => {
        const next = [...prev];
        batch.forEach((_, j) => {
          if (next[i + j]) next[i + j] = { ...next[i + j], status: 'processing' };
        });
        return next;
      });

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/bulk-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: batch.map(b => ({ title: b.title, year: b.year, embed_url: b.embed_url, content_type: b.content_type })),
            skipTmdb,
            contentType,
          }),
        });

        const data = await res.json();
        if (data.results) {
          setItems(prev => {
            const next = [...prev];
            data.results.forEach((r: any, j: number) => {
              const idx = i + j;
              if (next[idx]) {
                next[idx] = { ...next[idx], status: r.status, tmdbTitle: r.title };
              }
              if (r.status === 'added') added++;
              else if (r.status === 'exists') exists++;
              else if (r.status === 'not_found') notFound++;
              else errors++;
            });
            return next;
          });
        }
      } catch {
        setItems(prev => {
          const next = [...prev];
          batch.forEach((_, j) => { if (next[i + j]) { next[i + j] = { ...next[i + j], status: 'error' }; errors++; } });
          return next;
        });
      }

      setProcessed(Math.min(i + BATCH_SIZE, items.length));
      setStats({ added, exists, notFound, errors });
    }

    setIsImporting(false);
    toast({ title: 'Importação concluída', description: `${added} adicionados, ${exists} já existiam, ${notFound} não encontrados, ${errors} erros` });
  };

  const handleStop = () => { abortRef.current = true; };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const progress = items.length > 0 ? (processed / items.length) * 100 : 0;
  const validationProgress = items.length > 0 ? (validationStats.total / items.length) * 100 : 0;

  const statusIcon = (status?: string) => {
    switch (status) {
      case 'added': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'valid': return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'exists': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'not_found': return <XCircle className="w-4 h-4 text-orange-500" />;
      case 'invalid':
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <div className="w-4 h-4 rounded-full bg-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Abastecer Site</h1>
        <p className="text-muted-foreground mt-1">Importe via JSON, pasta de vídeos ou arquivo embutido</p>
      </div>

      {items.length === 0 ? (
        <div className="space-y-4">
          {/* Source buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="cursor-pointer">
              <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              <div className="flex items-center gap-3 p-4 premium-card hover:border-primary/30 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm">Arquivo JSON</p>
                  <p className="text-xs text-muted-foreground">Carregar .json do PC</p>
                </div>
              </div>
            </label>

            <div className="cursor-pointer" onClick={() => folderInputRef.current?.click()}>
              <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                onChange={handleFolderUpload}
                {...({ webkitdirectory: 'true', directory: 'true', multiple: true } as any)}
              />
              <div className="flex items-center gap-3 p-4 premium-card hover:border-primary/30 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm">Upload de Pasta</p>
                  <p className="text-xs text-muted-foreground">Detecta pelo nome do arquivo</p>
                </div>
              </div>
            </div>

            <div onClick={handleLoadBuiltIn} className="cursor-pointer">
              <div className="flex items-center gap-3 p-4 premium-card hover:border-primary/30 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm">JSON Embutido</p>
                  <p className="text-xs text-muted-foreground">Usar filmes.json do site</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content type */}
          <div className="p-4 premium-card space-y-2">
            <p className="text-sm font-heading font-medium">Tipo do conteúdo:</p>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant={contentType === 'movie' ? 'default' : 'outline'}
                onClick={() => setContentType('movie')} className="gap-2">
                <Clapperboard className="w-4 h-4" /> Filme
              </Button>
              <Button type="button" variant={contentType === 'series' ? 'default' : 'outline'}
                onClick={() => setContentType('series')} className="gap-2">
                <Tv className="w-4 h-4" /> Série
              </Button>
              <Button type="button" variant={contentType === 'movie' && false ? 'default' : 'outline'}
                onClick={() => setContentType('movie')} className="gap-2 border-dashed"
                title="O JSON detecta automaticamente pelo campo 'type' ou 'tipo'">
                <FileJson className="w-4 h-4" /> Misto (auto-detecta)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No modo Misto, cada item do JSON deve ter <code>"type": "movie"</code> ou <code>"type": "series"</code>.
            </p>
          </div>

          {/* Import mode */}
          <div className="flex items-center gap-3 p-4 premium-card">
            <Switch id="skip-tmdb" checked={skipTmdb} onCheckedChange={setSkipTmdb} />
            <Label htmlFor="skip-tmdb" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                {skipTmdb ? <Zap className="w-4 h-4 text-primary" /> : <Search className="w-4 h-4 text-primary" />}
                <span className="font-heading font-medium">
                  {skipTmdb ? 'Importação Direta (sem API)' : 'Importação com API de metadados'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {skipTmdb ? 'Importa dados básicos e link de player.' : 'Busca metadados completos (capa, descrição, categoria).'}
              </p>
            </Label>
          </div>

          <Textarea
            placeholder={'Cole o JSON aqui...\n\nFormato: [{ "titulo": "...", "ano": 2024, "url": "/slug.html" }, ...]'}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            className="min-h-[250px] font-mono text-xs bg-input border-border/50"
          />
          <Button onClick={handleParse} disabled={!jsonText.trim()} className="gap-2">
            <Upload className="w-4 h-4" /> Analisar JSON
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mode indicator */}
          <div className={cn(
            'flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-heading font-medium border',
            'bg-primary/10 text-primary border-primary/20'
          )}>
            {skipTmdb ? <Zap className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            {skipTmdb ? 'Modo sem API' : 'Modo com API'}
            <span className="text-muted-foreground">•</span>
            {contentType === 'movie' ? 'Tipo: Filme' : 'Tipo: Série'}
            <span className="text-muted-foreground">•</span>
            {items.length} itens
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: items.length, color: 'text-foreground' },
              { label: 'Adicionados', value: stats.added, color: 'text-green-500' },
              { label: 'Já existem', value: stats.exists, color: 'text-yellow-500' },
              { label: 'Não encontrados', value: stats.notFound, color: 'text-orange-500' },
              { label: 'Erros', value: stats.errors, color: 'text-destructive' },
            ].map(s => (
              <div key={s.label} className="premium-card p-3 text-center">
                <p className={cn('text-2xl font-bold font-heading', s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          {(isImporting || processed > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{processed} / {items.length} processados</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Validation progress */}
          {isValidating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Validando: {validationStats.total} / {items.length}</span>
                <span className="text-green-500">{validationStats.valid} válidos</span>
                <span className="text-destructive">{validationStats.invalid} inválidos</span>
              </div>
              <Progress value={validationProgress} className="bg-muted" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {!isImporting && !isValidating ? (
              <>
                <Button onClick={handleValidate} variant="outline" className="gap-2">
                  <ShieldCheck className="w-4 h-4" /> Validar Links
                </Button>
                <Button onClick={handleImport} className="gap-2">
                  <Play className="w-4 h-4" /> Iniciar Importação
                </Button>
                <Button variant="outline" onClick={() => { setItems([]); setJsonText(''); }}>
                  Limpar
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={handleStop}>Parar</Button>
            )}
          </div>

          {/* Preview */}
          {!isImporting && !isValidating && processed === 0 && (
            <div className="premium-card p-4 space-y-2">
              <p className="text-sm font-heading font-medium">Preview (5 primeiros):</p>
              {items.slice(0, 5).map((item, idx) => {
                const vidParam = item.embed_url.split('vid=')[1] || '';
                return (
                  <div key={`${item.title}-${idx}`} className="text-xs font-mono bg-input p-2.5 rounded-lg flex flex-col gap-1">
                    <span className="text-foreground">{item.title} ({item.year || 'N/A'}) • {item.content_type === 'movie' ? 'Filme' : 'Série'}</span>
                    <span className="text-muted-foreground break-all">vid={vidParam}</span>
                    {item.fileName && <span className="text-muted-foreground">📁 {item.fileName}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Items list */}
          <div className="premium-card max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-border/30">
              {items.map((item, idx) => (
                <div key={`${item.title}-${item.content_type}-${idx}`} className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm',
                  item.status === 'processing' && 'bg-primary/5'
                )}>
                  {statusIcon(item.status)}
                  <span className="flex-1 truncate">{item.tmdbTitle || item.title}</span>
                  <span className="text-muted-foreground text-xs">{item.year}</span>
                  <span className="text-muted-foreground text-xs">{item.content_type === 'movie' ? 'filme' : 'série'}</span>
                  <span className={cn('text-xs capitalize', 
                    item.status === 'valid' && 'text-green-500',
                    item.status === 'invalid' && 'text-destructive',
                  )}>{item.status || 'pendente'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}