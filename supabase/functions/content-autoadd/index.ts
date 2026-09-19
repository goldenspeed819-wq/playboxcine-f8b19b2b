import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const movieGenres: Record<number, string> = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia', 36: 'História',
  27: 'Terror', 10402: 'Música', 9648: 'Mistério', 10749: 'Romance',
  878: 'Ficção Científica', 10770: 'Cinema TV', 53: 'Thriller', 10752: 'Guerra', 37: 'Faroeste',
};

const tvGenres: Record<number, string> = {
  10759: 'Ação e Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime', 99: 'Documentário',
  18: 'Drama', 10751: 'Família', 10762: 'Kids', 9648: 'Mistério', 10763: 'News',
  10764: 'Reality', 10765: 'Ficção Científica', 10766: 'Novela', 10767: 'Talk',
  10768: 'Guerra e Política', 37: 'Faroeste',
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    if (!TMDB_API_KEY) {
      return new Response(JSON.stringify({ error: 'TMDB_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const query: string = (body.query || '').toString().trim();
    const requestedBy: string | null = body.userId || null;

    if (query.length < 2) {
      return new Response(JSON.stringify({ error: 'Busca muito curta' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Busca multi no TMDB (filmes + séries)
    const searchUrl = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=pt-BR&include_adult=false&query=${encodeURIComponent(query)}`;
    const tmdbRes = await fetch(searchUrl);
    const tmdbData = await tmdbRes.json();
    if (!tmdbRes.ok) throw new Error(tmdbData.status_message || 'Erro na API do TMDB');

    const candidates = (tmdbData.results || []).filter(
      (item: any) => item.media_type === 'movie' || item.media_type === 'tv',
    );

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ added: [], message: 'Nada encontrado no TMDB' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedQuery = normalize(query);
    // Prioriza títulos parecidos com a busca, depois popularidade
    candidates.sort((a: any, b: any) => {
      const aTitle = normalize(a.title || a.name || '');
      const bTitle = normalize(b.title || b.name || '');
      const aScore = (aTitle === normalizedQuery ? 2 : aTitle.includes(normalizedQuery) ? 1 : 0);
      const bScore = (bTitle === normalizedQuery ? 2 : bTitle.includes(normalizedQuery) ? 1 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return (b.popularity || 0) - (a.popularity || 0);
    });

    const picks = candidates.slice(0, 3);
    const added: any[] = [];

    for (const item of picks) {
      const isMovie = item.media_type === 'movie';
      const title: string = isMovie ? item.title : item.name;
      const releaseDate: string = isMovie ? item.release_date : item.first_air_date;
      const releaseYear = releaseDate ? Number(releaseDate.slice(0, 4)) : null;
      const genreMap = isMovie ? movieGenres : tvGenres;
      const category = (item.genre_ids || []).map((id: number) => genreMap[id]).filter(Boolean).join(', ') || null;
      const table = isMovie ? 'movies' : 'series';

      // Já existe? (por tmdb_id ou título)
      const { data: existingByTmdb } = await supabase
        .from(table).select('id, title, pending_content').eq('tmdb_id', item.id).maybeSingle();

      let record = existingByTmdb;

      if (!record) {
        const { data: sameTitle } = await supabase
          .from(table).select('id, title, pending_content').ilike('title', title).limit(1);
        record = sameTitle?.[0] || null;
      }

      if (record) {
        added.push({ id: record.id, title: record.title, type: isMovie ? 'movie' : 'series', pending: record.pending_content, existed: true });
        continue;
      }

      const payload: Record<string, unknown> = {
        title,
        description: item.overview || null,
        thumbnail: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : null,
        category,
        release_year: releaseYear,
        rating: item.vote_average ? item.vote_average.toFixed(1) : null,
        tmdb_id: item.id,
        pending_content: true,
        is_featured: false,
        is_release: false,
      };
      if (isMovie) {
        payload.cover = item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null;
      }

      const { data: inserted, error: insertError } = await supabase
        .from(table).insert(payload).select('id, title').single();

      if (insertError) {
        console.error(`Erro ao inserir ${table}:`, insertError.message);
        continue;
      }

      await supabase.from('content_requests').insert({
        query,
        title,
        content_type: isMovie ? 'movie' : 'series',
        content_id: inserted.id,
        tmdb_id: item.id,
        requested_by: requestedBy,
        status: 'pending',
      });

      added.push({ id: inserted.id, title: inserted.title, type: isMovie ? 'movie' : 'series', pending: true, existed: false });
    }

    return new Response(JSON.stringify({ added }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('content-autoadd error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
