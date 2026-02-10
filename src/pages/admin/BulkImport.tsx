import { useState, useRef } from 'react';
import { Upload, Play, CheckCircle, XCircle, AlertCircle, Loader2, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ParsedItem {
  title: string;
  year: string;
  embed_url: string;
  status?: 'pending' | 'processing' | 'added' | 'exists' | 'not_found' | 'error';
  tmdbTitle?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BATCH_SIZE = 5;

function cleanTitle(titulo: string, ano: string): string {
  // Pattern: "Title Name" + year(4digits) + duration + "min"
  const regex = new RegExp(`(.+)${ano}\\d+min$`);
  const match = titulo.match(regex);
  if (match) return match[1].trim();
  // Fallback: try removing year
  const idx = titulo.lastIndexOf(ano);
  if (idx > 0) return titulo.substring(0, idx).trim();
  return titulo;
}

function parseJSON(raw: string): ParsedItem[] {
  const data = JSON.parse(raw);
  const items: ParsedItem[] = [];

  for (const key of Object.keys(data)) {
    const entry = data[key];
    if (!entry.titulo || !entry.ano) continue;

    const title = cleanTitle(entry.titulo, entry.ano);
    
    // Get first available embed URL
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

    items.push({
      title,
      year: entry.ano,
      embed_url,
      status: 'pending',
    });
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
  const abortRef = useRef(false);

  const handleParse = () => {
    try {
      const parsed = parseJSON(jsonText);
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

  const handleImport = async () => {
    setIsImporting(true);
    abortRef.current = false;
    let added = 0, exists = 0, notFound = 0, errors = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (abortRef.current) break;

      const batch = items.slice(i, i + BATCH_SIZE);
      
      // Mark batch as processing
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
            items: batch.map(b => ({ title: b.title, year: b.year, embed_url: b.embed_url }))
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
      } catch (e) {
        // Mark batch as error
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
        <p className="text-muted-foreground mt-1">Cole um JSON com filmes/séries para importar automaticamente via TMDB</p>
      </div>

      {items.length === 0 ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" asChild>
                <span><FileJson className="w-4 h-4 mr-2" /> Carregar arquivo JSON</span>
              </Button>
            </label>
          </div>
          <Textarea
            placeholder='Cole o JSON aqui... (formato: { "id": { "titulo": "...", "ano": "...", "players": {...} }, ... })'
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

          {/* Items list */}
          <div className="bg-card border rounded-xl max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-border">
              {items.map((item, idx) => (
                <div key={idx} className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm",
                  item.status === 'processing' && "bg-primary/5"
                )}>
                  {statusIcon(item.status)}
                  <span className="flex-1 truncate">{item.tmdbTitle || item.title}</span>
                  <span className="text-muted-foreground text-xs">{item.year}</span>
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
