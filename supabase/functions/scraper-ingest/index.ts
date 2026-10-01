import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const IMG = 'https://image.tmdb.org/t/p';

const Episode = z.object({
  season: z.number().int().min(0),
  episode: z.number().int().min(1),
  video_url: z.string().url().max(2000),
  title: z.string().max(300).optional(),
});
const Item = z.object({
  type: z.enum(['movie', 'series']),
  tmdb_id: z.number().int().positive(),
  title: z.string().max(300).optional(),
  video_url: z.string().url().max(2000).optional(),
  episodes: z.array(Episode).max(2000).optional(),
});
const Body = z.object({ items: z.array(Item).min(1).max(50) });

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function tmdb(path: string) {
  const key = Deno.env.get('TMDB_API_KEY');
  const r = await fetch(`https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${key}&language=pt-BR`);
  return r.ok ? await r.json() : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const token = Deno.env.get('SCRAPER_TOKEN');
  if (!token || req.headers.get('x-scraper-token') !== token) return json({ error: 'unauthorized' }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const results: unknown[] = [];

  for (const item of parsed.data.items) {
    try {
      const table = item.type === 'movie' ? 'movies' : 'series';
      const { data: existing } = await db.from(table).select('id').eq('tmdb_id', item.tmdb_id).maybeSingle();
      let id = existing?.id as string | undefined;

      if (!id) {
        const d = await tmdb(`/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`);
        if (!d) { results.push({ tmdb_id: item.tmdb_id, error: 'tmdb_not_found' }); continue; }
        const date = d.release_date || d.first_air_date;
        const payload: Record<string, unknown> = {
          title: d.title || d.name || item.title,
          description: d.overview || null,
          thumbnail: d.poster_path ? `${IMG}/w500${d.poster_path}` : null,
          category: (d.genres || []).map((g: { name: string }) => g.name).join(', ') || null,
          release_year: date ? Number(date.slice(0, 4)) : null,
          rating: d.vote_average ? Number(d.vote_average).toFixed(1) : null,
          tmdb_id: item.tmdb_id,
          is_featured: false,
          is_release: false,
          pending_content: true,
        };
        if (item.type === 'movie') {
          payload.cover = d.backdrop_path ? `${IMG}/original${d.backdrop_path}` : null;
          payload.duration = d.runtime ? `${d.runtime}min` : null;
        }
        const { data: ins, error } = await db.from(table).insert(payload).select('id').single();
        if (error) throw error;
        id = ins.id;
      }

      if (item.type === 'movie' && item.video_url) {
        await db.from('movies').update({ video_url: item.video_url, pending_content: false }).eq('id', id);
      }

      let eps = 0;
      if (item.type === 'series' && item.episodes?.length) {
        const { data: have } = await db.from('episodes').select('id, season, episode').eq('series_id', id);
        const map = new Map((have || []).map((e) => [`${e.season}-${e.episode}`, e.id]));
        const toInsert = [];
        for (const ep of item.episodes) {
          const k = `${ep.season}-${ep.episode}`;
          if (map.has(k)) {
            await db.from('episodes').update({ video_url: ep.video_url }).eq('id', map.get(k));
          } else {
            toInsert.push({ series_id: id, season: ep.season, episode: ep.episode, title: ep.title || `Episódio ${ep.episode}`, video_url: ep.video_url });
          }
          eps++;
        }
        for (let i = 0; i < toInsert.length; i += 100) await db.from('episodes').insert(toInsert.slice(i, i + 100));
        await db.from('series').update({ pending_content: false }).eq('id', id);
      }

      await db.from('content_requests').update({ status: 'done' }).eq('tmdb_id', item.tmdb_id).eq('status', 'pending');
      results.push({ tmdb_id: item.tmdb_id, id, episodes: eps, ok: true });
    } catch (e) {
      results.push({ tmdb_id: item.tmdb_id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return json({ results });
});
