import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { items } = await req.json();

    if (!items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: 'items array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: any[] = [];

    for (const item of items) {
      const { title, year, embed_url } = item;
      
      try {
        // Search TMDB
        const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}&year=${year}&page=1`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.results || searchData.results.length === 0) {
          // Try without year
          const searchUrl2 = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}&page=1`;
          const searchRes2 = await fetch(searchUrl2);
          const searchData2 = await searchRes2.json();
          
          if (!searchData2.results || searchData2.results.length === 0) {
            results.push({ title, status: 'not_found' });
            continue;
          }
          searchData.results = searchData2.results;
        }

        const tmdbMovie = searchData.results[0];

        // Get details
        const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        const detailsRes = await fetch(detailsUrl);
        const details = await detailsRes.json();

        // Get content rating
        let contentRating = 'Livre';
        try {
          const releaseUrl = `${TMDB_BASE_URL}/movie/${tmdbMovie.id}/release_dates?api_key=${TMDB_API_KEY}`;
          const releaseRes = await fetch(releaseUrl);
          const releaseData = await releaseRes.json();
          const brRelease = releaseData.results?.find((r: any) => r.iso_3166_1 === 'BR');
          if (brRelease?.release_dates?.[0]?.certification) {
            const cert = brRelease.release_dates[0].certification;
            contentRating = cert === 'L' ? 'Livre' : cert ? `${cert}+` : 'Livre';
          }
        } catch { /* ignore */ }

        // Format duration
        let duration = '';
        if (details.runtime) {
          const hours = Math.floor(details.runtime / 60);
          const mins = details.runtime % 60;
          duration = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
        }

        const category = details.genres?.map((g: any) => g.name).join(', ') || 'Sem Categoria';

        // Check if movie already exists by title
        const { data: existing } = await supabase
          .from('movies')
          .select('id')
          .eq('title', details.title || title)
          .maybeSingle();

        if (existing) {
          results.push({ title: details.title || title, status: 'exists' });
          continue;
        }

        // Insert movie
        const { error: insertError } = await supabase.from('movies').insert({
          title: details.title || title,
          description: details.overview || '',
          thumbnail: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE}/w500${tmdbMovie.poster_path}` : null,
          cover: tmdbMovie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${tmdbMovie.backdrop_path}` : null,
          video_url: embed_url || null,
          release_year: details.release_date ? new Date(details.release_date).getFullYear() : parseInt(year) || null,
          duration,
          rating: contentRating,
          category,
          is_featured: false,
          is_release: false,
        });

        if (insertError) {
          results.push({ title: details.title || title, status: 'error', error: insertError.message });
        } else {
          results.push({ title: details.title || title, status: 'added' });
        }

        // Small delay to respect TMDB rate limits
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        results.push({ title, status: 'error', error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Bulk import error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
