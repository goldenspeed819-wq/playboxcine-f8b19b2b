import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const IMG = 'https://image.tmdb.org/t/p/w500';
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Fills missing episode thumbnails (TMDB still images) for one series, or all series.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const seriesId: string | undefined = typeof body?.series_id === 'string' ? body.series_id : undefined;
    const key = Deno.env.get('TMDB_API_KEY');
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let q = sb.from('series').select('id, tmdb_id, thumbnail').not('tmdb_id', 'is', null);
    if (seriesId) q = q.eq('id', seriesId);
    const { data: seriesList } = await q;
    let updated = 0;

    for (const s of seriesList || []) {
      const { data: eps } = await sb.from('episodes').select('id, season, episode, title, description').eq('series_id', s.id).is('thumbnail', null);
      if (!eps?.length) continue;
      const seasons = [...new Set(eps.map((e) => e.season))];
      for (const season of seasons) {
        const r = await fetch(`https://api.themoviedb.org/3/tv/${s.tmdb_id}/season/${season}?api_key=${key}&language=pt-BR`);
        const d = r.ok ? await r.json() : null;
        const list: any[] = d?.episodes || [];
        for (const e of eps.filter((x) => x.season === season)) {
          // Supports continuous numbering: fall back to index within season.
          const t = list.find((x) => x.episode_number === e.episode) ?? null;
          const thumb = t?.still_path ? IMG + t.still_path : s.thumbnail;
          if (!thumb) continue;
          const patch: Record<string, unknown> = { thumbnail: thumb };
          if (!e.title && t?.name) patch.title = t.name;
          if (!e.description && t?.overview) patch.description = t.overview;
          await sb.from('episodes').update(patch).eq('id', e.id);
          updated++;
        }
      }
    }
    return json({ success: true, updated });
  } catch (e) {
    return json({ success: false, error: String(e) }, 500);
  }
});
