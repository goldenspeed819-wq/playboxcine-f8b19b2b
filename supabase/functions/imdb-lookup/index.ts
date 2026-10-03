import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tmdb_id, type } = await req.json().catch(() => ({}));
    const id = Number(tmdb_id);
    if (!Number.isInteger(id) || id <= 0 || !['movie', 'tv'].includes(type)) {
      return json({ error: 'tmdb_id/type inválidos' }, 400);
    }
    const key = Deno.env.get('TMDB_API_KEY');
    if (!key) return json({ error: 'TMDB_API_KEY ausente' }, 500);
    const r = await fetch(`https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${key}`);
    if (!r.ok) return json({ error: `TMDB ${r.status}`, details: await r.text() }, r.status);
    const d = await r.json();
    return json({ imdb_id: d.imdb_id ?? null, tmdb_id: id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'erro' }, 500);
  }
});
