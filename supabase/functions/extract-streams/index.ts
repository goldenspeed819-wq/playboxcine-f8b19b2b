import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const EXTERNAL_URL = 'https://dnaarxjsqkaybwntdbcx.supabase.co';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Pega qualquer coluna do registro que contenha uma URL
function collectUrls(row: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const v of Object.values(row)) {
    if (typeof v === 'string' && /^https?:\/\//i.test(v.trim()) && !/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(v) && !/image\.tmdb/i.test(v)) out.push(v.trim());
    else if (Array.isArray(v)) for (const x of v) {
      if (typeof x === 'string' && /^https?:\/\//i.test(x)) out.push(x);
      else if (x && typeof x === 'object' && typeof (x as any).url === 'string') out.push((x as any).url);
    }
  }
  return [...new Set(out)];
}

const pickTitle = (row: Record<string, unknown>) =>
  (row.titulo ?? row.title ?? row.nome ?? row.name ?? null) as string | null;

// Lê a página do RedeCanais e extrai os iframes/embeds reais
async function resolveRedeCanaisPage(pageUrl: string): Promise<string[]> {
  try {
    const r = await fetch(pageUrl, { headers: { 'User-Agent': UA, Referer: new URL(pageUrl).origin + '/' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const html = await r.text();
    const found = new Set<string>();
    for (const m of html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)) found.add(m[1]);
    for (const m of html.matchAll(/["']((?:https?:)?\/\/[^"'\s]*(?:server\.php|player|embed|rcserver)[^"'\s]*)["']/gi)) found.add(m[1]);
    for (const m of html.matchAll(/["'](\/[^"'\s]*(?:server\.php|player3?\/)[^"'\s]*)["']/gi)) found.add(m[1]);
    const origin = new URL(pageUrl).origin;
    return [...found]
      .map((u) => (u.startsWith('//') ? `https:${u}` : u.startsWith('/') ? origin + u : u))
      .filter((u) => !/facebook|google|twitter|ads|analytics/i.test(u));
  } catch {
    return [];
  }
}

type Server = Record<string, unknown>;
function classify(u: string, idx: number, extra: Record<string, unknown> = {}): Server {
  if (/\.(m3u8|mpd|mp4)(\?|$)/i.test(u) || /\/stream\/|dynamic-proxy/i.test(u))
    return { id: `direct-${idx}`, name: `Servidor ${idx}`, type: 'direct', url: u, format: /\.m3u8/i.test(u) ? 'hls' : /\.mpd/i.test(u) ? 'dash' : 'mp4', ...extra };
  let videoId = '', serverName = '';
  try { const p = new URL(u); videoId = p.searchParams.get('vid') || ''; serverName = p.searchParams.get('server') || ''; } catch { /* */ }
  return {
    id: `redecanais-${idx}`, name: `RedeCanais ${serverName || idx}`, type: 'redecanais_bridge', embedUrl: u, videoId, serverName,
    // O navegador do usuário abre esse embed (com o IP dele) e o player Rynex controla o vídeo
    externalControls: true, ...extra,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const apiKey = Deno.env.get('EXTRACT_API_KEY');
  const extKey = Deno.env.get('SECRET_SAPI');
  if (!apiKey) return json({ success: false, error: 'API key não configurada' }, 500);
  if (!extKey) return json({ success: false, error: 'SECRET_SAPI não configurada' }, 500);

  const url = new URL(req.url);
  const provided = req.headers.get('x-api-key') || url.searchParams.get('key') || '';
  if (!provided || !safeEq(provided, apiKey)) return json({ success: false, error: 'Unauthorized' }, 401);

  let input: Record<string, unknown> = Object.fromEntries(url.searchParams);
  if (req.method === 'POST') {
    try { input = { ...input, ...(await req.json()) }; } catch { return json({ success: false, error: 'JSON inválido' }, 400); }
  }

  const tmdbId = input.tmdbId ? Number(input.tmdbId) : null;
  const imdbId = typeof input.imdbId === 'string' ? input.imdbId.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 200) : '';
  const directPage = typeof input.url === 'string' ? input.url.trim() : '';

  if (tmdbId !== null && (!Number.isInteger(tmdbId) || tmdbId <= 0)) return json({ success: false, error: 'tmdbId inválido' }, 400);
  if (imdbId && !/^tt\d{5,10}$/.test(imdbId)) return json({ success: false, error: 'imdbId inválido' }, 400);
  if (directPage && !/^https:\/\/(www\.)?redecanais\.[a-z]{2,}\//i.test(directPage)) return json({ success: false, error: 'url deve ser uma página do RedeCanais' }, 400);
  if (!tmdbId && !imdbId && !title && !directPage) return json({ success: false, error: 'Informe tmdbId, imdbId, title ou url' }, 400);

  let row: Record<string, unknown> | null = null;
  let pages: string[] = [];

  if (directPage) {
    pages = [directPage];
  } else {
    const ext = createClient(EXTERNAL_URL, extKey, { auth: { persistSession: false } });
    const tries: Array<[string, string | number]> = [];
    if (tmdbId) tries.push(['tmdb_id', tmdbId], ['tmdb', tmdbId], ['id_tmdb', tmdbId]);
    if (imdbId) tries.push(['imdb_id', imdbId], ['imdb', imdbId]);
    for (const [col, val] of tries) {
      const { data, error } = await ext.from('filmes').select('*').eq(col, val).limit(1);
      if (!error && data?.length) { row = data[0]; break; }
    }
    if (!row && title) {
      for (const col of ['titulo', 'title', 'nome']) {
        const { data, error } = await ext.from('filmes').select('*').ilike(col, `%${title}%`).limit(1);
        if (!error && data?.length) { row = data[0]; break; }
      }
    }
    if (!row) return json({ success: false, error: 'Filme não encontrado na tabela filmes' }, 404);
    pages = collectUrls(row);
  }

  const servers: Server[] = [];
  let i = 1;
  for (const u of pages) {
    if (/redecanais\.[a-z]+\/.*\.html/i.test(u)) {
      const embeds = await resolveRedeCanaisPage(u);
      if (embeds.length) for (const e of embeds) servers.push(classify(e, i++, { sourcePage: u }));
      else servers.push({ id: `redecanais-page-${i++}`, name: 'RedeCanais (página)', type: 'redecanais_bridge', embedUrl: u, sourcePage: u, externalControls: true });
    } else servers.push(classify(u, i++));
  }

  if (!servers.length) return json({ success: false, title: row ? pickTitle(row) : null, error: 'Nenhuma URL de vídeo encontrada', servers: [] }, 404);
  return json({ success: true, title: row ? pickTitle(row) : null, tmdbId, type: 'movie', servers });
});
