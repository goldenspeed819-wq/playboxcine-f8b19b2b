import { useMemo, useState } from 'react';
import { Copy, Check, Bookmark, Terminal, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import scraperSource from '@/lib/scraper/rynex-scraper.js?raw';

const BrowserScraper = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const bookmarklet = useMemo(() => {
    const compact = scraperSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\n\s*/g, ' ')
      .trim();
    return `javascript:${encodeURIComponent(compact)}`;
  }, []);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copiado!' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Scraper do Navegador</h1>
        <p className="text-muted-foreground text-sm mt-1">
          O scraper roda dentro do seu navegador, na aba do site de origem — assim ele passa pelo Cloudflare
          normalmente (você já está autenticado na página) e captura os streams reais que o player carrega.
        </p>
      </div>

      <div className="premium-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <Bookmark className="h-4 w-4 text-primary" /> 1. Crie o favorito (bookmarklet)
        </div>
        <ol className="text-sm text-muted-foreground list-decimal ml-5 space-y-1">
          <li>Copie o código abaixo.</li>
          <li>No navegador, crie um novo favorito (Ctrl+D → Editar) com o nome <b>Rynex Scraper</b>.</li>
          <li>No campo <b>URL</b> do favorito, cole o código copiado e salve.</li>
        </ol>
        <div className="flex gap-2">
          <Textarea readOnly value={bookmarklet} className="font-mono text-[10px] h-24" />
          <Button onClick={() => copy(bookmarklet, 'bm')} className="shrink-0">
            {copied === 'bm' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="premium-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <Terminal className="h-4 w-4 text-primary" /> 2. Ou cole no console (F12)
        </div>
        <p className="text-sm text-muted-foreground">
          Abra a página do filme/série no site de origem, aperte F12 → Console, cole o script e dê Enter.
        </p>
        <div className="flex gap-2">
          <Textarea readOnly value={scraperSource} className="font-mono text-[10px] h-40" />
          <Button variant="secondary" onClick={() => copy(scraperSource, 'src')} className="shrink-0">
            {copied === 'src' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="premium-card p-5 space-y-3">
        <div className="font-semibold">3. Como usar em massa</div>
        <ol className="text-sm text-muted-foreground list-decimal ml-5 space-y-1">
          <li>Abra a página do conteúdo e clique no favorito <b>Rynex Scraper</b> (um painel vermelho aparece no canto).</li>
          <li>Dê <b>play</b> no vídeo — o painel mostra os streams detectados (.m3u8 / .mp4).</li>
          <li>Clique em <b>Adicionar</b> — confirme o título. O item entra na fila.</li>
          <li>Vá para o próximo filme/série e repita. A fila fica salva, mesmo trocando de página.</li>
          <li>No fim, clique em <b>Copiar JSON</b> e cole em <b>JSON Externo</b> para importar tudo de uma vez.</li>
        </ol>
        <Button asChild variant="outline" className="mt-2">
          <Link to="/admin/external-import">
            Ir para JSON Externo <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default BrowserScraper;
