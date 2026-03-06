import { useState, useRef } from 'react';
import { Upload, Play, CheckCircle, XCircle, AlertCircle, Loader2, FileJson, Zap, Search, Clapperboard, Tv } from 'lucide-react';
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
  status?: 'pending' | 'processing' | 'added' | 'exists' | 'not_found' | 'error';
  tmdbTitle?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BATCH_SIZE = 5;
const PLAYER_BASE = 'https://redecanais.cafe/player3/server.php?server=RCServer26&subfolder=ondemand&vid=';

const URL_CLEANUP_TOKENS = new Set([
  'dublado',
  'legendado',
  'nacional',
  'dual',
  'audio',
  'dual-audio',
  'filme',
  'ova',
]);

function titleToVid(title: string): string {
  let t = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/e/g, '');
  t = t.replace(/[^A-Za-z0-9]/g, '');
  return t.toUpperCase();
}

function relativeUrlToVid(relativeUrl: string): string {
  if (!relativeUrl) return '';

  const rawPath = relativeUrl
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\//, '')
    .replace(/\.html$/i, '')
    .replace(/_[a-f0-9]+$/i, '');

  const cleanedSlug = rawPath
    .split('-')
    .filter(Boolean)
    .filter((token) => !URL_CLEANUP_TOKENS.has(token.toLowerCase()))
    .filter((token) => !/^\d{4}$/.test(token))
    .filter((token) => !/^\d{3,4}p$/i.test(token))
    .join(' ')
    .trim();

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
        const slug = relativeUrl
          .replace(/\.html$/, '')
          .replace(/_[a-f0-9]+$/, '')
          .replace(/^\//, '');
        const cleaned = slug
          .replace(/-(dublado|legendado|nacional|dual-audio)/gi, '')
          .replace(/-\d{4}/, '')
          .replace(/-\d{3,4}p/, '')
          .replace(/-/g, ' ')
          .trim();
        title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }

      title = cleanTitle(title, ano);
      if (!title) continue;

      // 1) Try from URL slug (more accurate for this source)
      // 2) Fallback to title-based conversion
      const vid = relativeUrlToVid(relativeUrl) || titleToVid(title);
      const embed_url = vid ? `${PLAYER_BASE}${vid}` : '';

      items.push({
        title,
        year: ano,
        embed_url,
        content_type: forcedType,
        status: 'pending',
      });
    }
    return items;
  }

  if (typeof data === 'object' && data !== null) {
    for (const key of Object.keys(data)) {
      const entry = data[key];
      if (!entry.titulo || !entry.ano) continue;

      const title = cleanTitle(entry.titulo, entry.ano);

      let embed_url = '';
      if (entry.players) {
        for (const provider of Object.keys(entry.players)) {
          const players = entry.players[provider];
          if (Array.isArray(players) && players.length > 0 && players[0].embed_url) {
            embed_url = players[0].embed_url;
            break;
          }
        }
      }

      items.push({ title, year: entry.ano, embed_url, content_type: forcedType, status: 'pending' });
    }
  }

  return items;
}

export default function BulkImport() {
  const { toast } = useToast();
  const [jsonText, setJsonText] = useState('');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [stats, setStats] = useState({ added: 0, exists: 0, notFound: 0, errors: 0 });
  const [skipTmdb, setSkipTmdb] = useState(true);
  const [contentType, setContentType] = useState<ContentType>('movie');
  const abortRef = useRef(false);

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
            items: batch.map((b) => ({
              title: b.title,
              year: b.year,
              embed_url: b.embed_url,
              content_type: b.content_type,
            })),
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
          batch.forEach((_, j) => {
            if (next[i + j]) next[i + j] = { ...next[i + j], status: 'error' };
            errors++;
          });
          return next;
        });
      }

      setProcessed(Math.min(i + BATCH_SIZE, items.length));
      setStats({ added, exists, notFound, errors });
    }

    setIsImporting(false);
    toast({ title: 'Importação concluída', description: `${added} adicionados, ${exists} já existiam, ${notFound} não encontrados, ${errors} erros` });
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const progress = items.length > 0 ? (processed / items.length) * 100 : 0;

  const statusIcon = (status?: string) => {
    switch (status) {
      case 'added': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'exists': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'not_found': return <XCircle className="w-4 h-4 text-orange-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <div className="w-4 h-4 rounded-full bg-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abastecer Site</h1>
        <p className="text-muted-foreground mt-1">Importe em massa como filme ou série, com ou sem API externa</p>
      </div>

      {items.length === 0 ? (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" asChild>
                <span><FileJson className="w-4 h-4 mr-2" /> Carregar arquivo JSON</span>
              </Button>
            </label>
            <Button variant="outline" onClick={handleLoadBuiltIn}>
              <FileJson className="w-4 h-4 mr-2" /> Usar filmes.json embutido
            </Button>
          </div>

          {/* Content type selector */}
          <div className="p-4 bg-card border rounded-xl space-y-2">
            <p className="text-sm font-medium">Tipo do conteúdo para importar:</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={contentType === 'movie' ? 'default' : 'outline'}
                onClick={() => setContentType('movie')}
                className="gap-2"
              >
                <Clapperboard className="w-4 h-4" /> Filme
              </Button>
              <Button
                type="button"
                variant={contentType === 'series' ? 'default' : 'outline'}
                onClick={() => setContentType('series')}
                className="gap-2"
              >
                <Tv className="w-4 h-4" /> Série
              </Button>
            </div>
          </div>

          {/* Import mode toggle */}
          <div className="flex items-center gap-3 p-4 bg-card border rounded-xl">
            <Switch id="skip-tmdb" checked={skipTmdb} onCheckedChange={setSkipTmdb} />
            <Label htmlFor="skip-tmdb" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                {skipTmdb ? <Zap className="w-4 h-4 text-yellow-500" /> : <Search className="w-4 h-4 text-primary" />}
                <span className="font-medium">
                  {skipTmdb ? 'Importação Direta (sem API)' : 'Importação com API de metadados'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {skipTmdb
                  ? 'Sem API externa: importa dados básicos e link de player.'
                  : 'Busca metadados completos automaticamente (capa, descrição, categoria).'}
              </p>
            </Label>
          </div>

          <Textarea
            placeholder={'Cole o JSON aqui...\n\nFormato 1 (array): [{ "titulo": "...", "ano": 2024, "url": "/slug.html" }, ...]\nFormato 2 (objeto): { "id": { "titulo": "...", "ano": "...", "players": {...} }, ... }'}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            className="min-h-[300px] font-mono text-xs"
          />
          <Button onClick={handleParse} disabled={!jsonText.trim()} className="gap-2">
            <Upload className="w-4 h-4" /> Analisar JSON
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mode indicator */}
          <div className={cn(
            'flex flex-wrap items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border',
            skipTmdb ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-primary/10 text-primary border-primary/20'
          )}>
            {skipTmdb ? <Zap className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            {skipTmdb ? 'Modo sem API' : 'Modo com API'}
            <span>•</span>
            {contentType === 'movie' ? 'Tipo: Filme' : 'Tipo: Série'}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.added}</p>
              <p className="text-xs text-muted-foreground">Adicionados</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats.exists}</p>
              <p className="text-xs text-muted-foreground">Já existem</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.notFound}</p>
              <p className="text-xs text-muted-foreground">Não encontrados</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{processed} / {items.length} processados</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isImporting ? (
              <>
                <Button onClick={handleImport} className="gap-2">
                  <Play className="w-4 h-4" /> Iniciar Importação
                </Button>
                <Button variant="outline" onClick={() => { setItems([]); setJsonText(''); }}>
                  Limpar
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={handleStop}>
                Parar
              </Button>
            )}
          </div>

          {/* Preview first items with vid= */}
          {!isImporting && processed === 0 && (
            <div className="bg-muted/50 border rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">Preview dos primeiros 5 itens (vid=):</p>
              {items.slice(0, 5).map((item, idx) => {
                const vidParam = item.embed_url.split('vid=')[1] || '';
                return (
                  <div key={`${item.title}-${idx}`} className="text-xs font-mono bg-card p-2 rounded flex flex-col gap-1">
                    <span className="text-foreground">{item.title} ({item.year || 'N/A'}) • {item.content_type === 'movie' ? 'Filme' : 'Série'}</span>
                    <span className="text-muted-foreground break-all">vid={vidParam}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Items list */}
          <div className="bg-card border rounded-xl max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-border">
              {items.map((item, idx) => (
                <div key={`${item.title}-${item.content_type}-${idx}`} className={cn(
                  'flex items-center gap-3 px-4 py-2 text-sm',
                  item.status === 'processing' && 'bg-primary/5'
                )}>
                  {statusIcon(item.status)}
                  <span className="flex-1 truncate">{item.tmdbTitle || item.title}</span>
                  <span className="text-muted-foreground text-xs">{item.year}</span>
                  <span className="text-muted-foreground text-xs">{item.content_type === 'movie' ? 'filme' : 'série'}</span>
                  <span className="text-xs text-muted-foreground capitalize">{item.status || 'pendente'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
