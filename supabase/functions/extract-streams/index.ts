import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type Server = Record<string, unknown>;

function buildServers(url: string | null | undefined, idx: number, label: string): Server[] {
  if (!url) return [];
  const u = url.trim();
  if (/redecanais|rcserver|server\.php/i.test(u)) {
    let videoId = '', serverName = '', category = 'ondemand';
    try {
      const p = new URL(u.startsWith('//') ? `https:${u}` : u);
      videoId = p.searchParams.get('vid') || '';
      serverName = p.searchParams.get('server') || '';
      category = p.searchParams.get('subfolder') || category;
    } catch { /* keep defaults */ }
    return [{ id: `redecanais-server-${idx}`, name: `RedeCanais ${label}`, type: 'redecanais_bridge', embedUrl: u, videoId, serverName, category }];
  }
  const isEmbed = /youtube|youtu\.be|vimeo|\/embed|\/e\/|\.php(\?|$)|\.html?(\?|$)/i.test(u);
  if (isEmbed) return [{ id: `embed-${idx}`, name: `Embed ${label}`, type: 'embed', embedUrl: u }];
  return [{ id: `stream-direct-${idx}`, name: `Servidor ${label}`, type: 'direct', url: u, format: /\.m3u8/i.test(u) ? 'hls' : /\.mpd/i.test(u) ? 'dash' : 'mp4' }];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const apiKey = Deno.env.get('EXTRACT_API_KEY');
  if (!apiKey) return json({ success: false, error: 'API key não configurada no servidor' }, 500);

  const url = new URL(req.url);
  const provided = req.headers.get('x-api-key') || url.searchParams.get('key') || '';
  if (!provided || !timingSafeEqual(provided, apiKey)) return json({ success: false, error: 'Unauthorized' }, 401);

  let input: Record<string, unknown> = Object.fromEntries(url.searchParams);
  if (req.method === 'POST') {
    try { input = { ...input, ...(await req.json()) }; } catch { return json({ success: false, error: 'JSON inválido' }, 400); }
  }

  const tmdbId = input.tmdbId ? Number(input.tmdbId) : null;
  const imdbId = typeof input.imdbId === 'string' ? input.imdbId.trim() : '';
  const type = input.type === 'tv' ? 'tv' : input.type === 'movie' ? 'movie' : null;
  const season = input.season ? Number(input.season) : 1;
  const episode = input.episode ? Number(input.episode) : 1;

  if (!type) return json({ success: false, error: "type deve ser 'movie' ou 'tv'" }, 400);
  if (tmdbId !== null && (!Number.isInteger(tmdbId) || tmdbId <= 0)) return json({ success: false, error: 'tmdbId inválido' }, 400);
  if (imdbId && !/^tt\d{5,10}$/.test(imdbId)) return json({ success: false, error: 'imdbId inválido' }, 400);
  if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 0 || episode < 0) return json({ success: false, error: 'season/episode inválidos' }, 400);

  let resolvedTmdb = tmdbId;
  if (!resolvedTmdb && imdbId) {
    const tmdbKey = Deno.env.get('TMDB_API_KEY');
    if (!tmdbKey) return json({ success: false, error: 'Conversão IMDb indisponível; envie tmdbId' }, 400);
    try {
      const r = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbKey}&external_source=imdb_id`, { signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      resolvedTmdb = (type === 'movie' ? d.movie_results : d.tv_results)?.[0]?.id ?? null;
    } catch {
      return json({ success: false, error: 'TMDB não respondeu' }, 504);
    }
  }
  if (!resolvedTmdb) return json({ success: false, error: 'Informe tmdbId ou imdbId' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    if (type === 'movie') {
      const { data, error } = await db.from('movies').select('title, video_url, video_url_part2').eq('tmdb_id', resolvedTmdb).maybeSingle();
      if (error) throw error;
      if (!data) return json({ success: false, error: 'Filme não encontrado no catálogo' }, 404);
      const servers = [...buildServers(data.video_url, 1, 'Principal'), ...buildServers(data.video_url_part2, 2, 'Parte 2')];
      if (!servers.length) return json({ success: false, title: data.title, error: 'Conteúdo ainda sem vídeo', servers: [] }, 404);
      return json({ success: true, title: data.title, tmdbId: resolvedTmdb, type, servers });
    }

    const { data: s, error: se } = await db.from('series').select('id, title').eq('tmdb_id', resolvedTmdb).maybeSingle();
    if (se) throw se;
    if (!s) return json({ success: false, error: 'Série não encontrada no catálogo' }, 404);
    const { data: ep, error: ee } = await db.from('episodes').select('title, video_url').eq('series_id', s.id).eq('season', season).eq('episode', episode).maybeSingle();
    if (ee) throw ee;
    if (!ep) return json({ success: false, title: s.title, error: `T${season}E${episode} não encontrado` }, 404);
    const servers = buildServers(ep.video_url, 1, 'Principal');
    if (!servers.length) return json({ success: false, title: s.title, error: 'Episódio sem vídeo', servers: [] }, 404);
    return json({ success: true, title: s.title, episodeTitle: ep.title, tmdbId: resolvedTmdb, type, season, episode, servers });
  } catch (e) {
    console.error('extract-streams error', e);
    return json({ success: false, error: 'Erro ao consultar o catálogo' }, 500);
  }
});
