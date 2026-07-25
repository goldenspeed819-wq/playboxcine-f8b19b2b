import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, Bookmark, Terminal, ArrowRight, PlayCircle, Download, Chrome } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import scraperSource from '@/lib/scraper/rynex-scraper.js?raw';

const BrowserScraper = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const extensionFile = 'rynex-helper-v107.zip';

  const bookmarklet = useMemo(() => {
    const origin = window.location.origin;
    const loader = `(function(){var s=document.createElement('script');s.src='${origin}/rynex-scraper.js?v='+(Date.now());s.onload=function(){window.__RYNEX_SCRAPER__&&window.__RYNEX_SCRAPER__.open&&window.__RYNEX_SCRAPER__.open()};s.onerror=function(){alert('O site bloqueou o carregamento automático. Use o código do console em Admin > Scraper.')};document.documentElement.appendChild(s)})()`;
    return `javascript:${loader}`;
  }, []);

  const dragRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // definido via DOM: o React bloqueia/avisa em href="javascript:"
    if (dragRef.current) dragRef.current.setAttribute('href', bookmarklet);
  }, [bookmarklet]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copiado!' });
  };

  const downloadExtension = () => {
    fetch(`/${extensionFile}?v=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Falha no download: ${res.status}`);
        return res.blob();
      })
      .then(async (blob) => {
        const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        const isZip = header[0] === 0x50 && header[1] === 0x4b;
        if (!isZip || blob.size < 10000) {
          throw new Error('Download incompleto. Recarregue a página e baixe novamente.');
        }
        return blob;
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = extensionFile;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => toast({ title: err.message, variant: 'destructive' }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Scraper do Navegador</h1>
        <p className="text-muted-foreground text-sm mt-1">
          O scraper roda dentro do seu navegador, na aba do site de origem — assim ele passa pelo Cloudflare
          normalmente. Ele captura o <b>link de embed</b> do player (RCServer / server.php), que é o mesmo que
          você pegava no botão EMBED.
        </p>
      </div>

      <div className="premium-card p-5 space-y-4 border-primary/40">
        <div className="flex items-center gap-2 font-semibold">
          <Chrome className="h-4 w-4 text-primary" /> Extensão do Chrome (recomendado)
        </div>
        <p className="text-sm text-muted-foreground">
          Agora ela é o <b>Rynex Controle v1.0.7</b>: ela roda dentro do iframe do RedeCanais e comanda o{' '}
          <b>vídeo direto</b> (play/pausa, avançar, volume, velocidade e tela cheia) — sem depender de clique
          simulado. O controle remoto no celular usa a mesma ponte. A captura de embed ficou opcional no fim do
          painel.
        </p>
        <Button onClick={downloadExtension}>
          <Download className="h-4 w-4 mr-2" /> Baixar extensão v1.0.7 (.zip)
        </Button>
        <ol className="text-sm text-muted-foreground list-decimal ml-5 space-y-1">
          <li>Apague downloads antigos (<b>rynex-extension</b> / <b>rynex-helper-v104</b>).</li>
          <li>Baixe e descompacte <b>{extensionFile}</b>.</li>
          <li>Abra <b>chrome://extensions</b> no Chrome (ou Edge/Brave/Opera).</li>
          <li>Ative o <b>Modo do desenvolvedor</b> (canto superior direito).</li>
          <li>Clique em <b>Carregar sem compactação</b> e selecione a pasta descompactada.</li>
          <li>Na aba do player, clique no ícone da extensão e use <b>Dar play</b>, volume e tela cheia.</li>
          <li>Se quiser importar conteúdo, abra <b>Capturar embed (opcional)</b> no fim do painel.</li>
        </ol>
      </div>

      <div className="premium-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <Bookmark className="h-4 w-4 text-primary" /> 1. Crie o favorito (bookmarklet)
        </div>
        <p className="text-sm text-muted-foreground">
          Mostre a barra de favoritos (Ctrl+Shift+B) e <b>arraste o botão abaixo</b> para ela. Agora o favorito é
          só um carregador pequeno, então ele não fica pesado nem falha sem abrir nada.
        </p>
        <a
          ref={dragRef}
          draggable
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold cursor-grab select-none"
        >
          <Bookmark className="h-4 w-4 text-primary" /> Rynex Scraper (arraste-me)
        </a>
        <p className="text-xs text-muted-foreground">
          Se preferir colar manualmente: copie o código abaixo, crie o favorito, cole na URL e digite
          <b> javascript:</b> na frente (sem espaço) antes de salvar.
        </p>
        <div className="flex gap-2">
          <Textarea readOnly value={bookmarklet} className="font-mono text-[10px] h-24" />
          <Button onClick={() => copy(bookmarklet, 'bm')} className="shrink-0">
            {copied === 'bm' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="premium-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <PlayCircle className="h-4 w-4 text-primary" /> Teste rápido
        </div>
        <p className="text-sm text-muted-foreground">
          Clique aqui para abrir o painel nesta própria página. Se abrir aqui, o favorito foi criado corretamente;
          depois use ele na página do conteúdo.
        </p>
        <Button onClick={() => import('@/lib/scraper/rynex-scraper.js?raw').then(() => eval(scraperSource))}>
          Abrir painel de teste
        </Button>
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
          <li>Clique em <b>Procurar embed</b> — ele varre iframes, o HTML e tenta clicar no botão EMBED do player.</li>
          <li>Se não achar, clique no <b>EMBED</b> do player, copie o link e cole no campo do painel.</li>
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
