import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase env vars' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { items, skipTmdb } = body;

    if (!items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: 'items array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    const useTmdb = !skipTmdb && !!TMDB_API_KEY;

    const results: any[] = [];

    for (const item of items) {
      const { title, year, embed_url, category, thumbnail, description } = item;

      try {
        // Check if movie already exists
        const { data: existing } = await supabase
          .from('movies')
          .select('id')
          .eq('title', title)
          .maybeSingle();

        if (existing) {
          results.push({ title, status: 'exists' });
          continue;
        }

        if (useTmdb) {
          // ---- TMDB enriched import ----
          const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}&year=${year}&page=1`;
          const searchRes = await fetch(searchUrl);
          const searchData = await searchRes.json();

          if (!searchData.results || searchData.results.length === 0) {
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
          const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
          const detailsRes = await fetch(detailsUrl);
          const details = await detailsRes.json();

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

          let duration = '';
          if (details.runtime) {
            const hours = Math.floor(details.runtime / 60);
            const mins = details.runtime % 60;
            duration = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
          }

          const tmdbCategory = details.genres?.map((g: any) => g.name).join(', ') || 'Sem Categoria';

          // Check again with TMDB title
          const { data: existing2 } = await supabase
            .from('movies')
            .select('id')
            .eq('title', details.title || title)
            .maybeSingle();

          if (existing2) {
            results.push({ title: details.title || title, status: 'exists' });
            continue;
          }

          const { error: insertError } = await supabase.from('movies').insert({
            title: details.title || title,
            description: details.overview || '',
            thumbnail: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE}/w500${tmdbMovie.poster_path}` : null,
            cover: tmdbMovie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${tmdbMovie.backdrop_path}` : null,
            video_url: embed_url || null,
            release_year: details.release_date ? new Date(details.release_date).getFullYear() : parseInt(year) || null,
            duration,
            rating: contentRating,
            category: tmdbCategory,
            is_featured: false,
            is_release: false,
          });

          if (insertError) {
            results.push({ title: details.title || title, status: 'error', error: insertError.message });
          } else {
            results.push({ title: details.title || title, status: 'added' });
          }

          await new Promise(r => setTimeout(r, 300));
        } else {
          // ---- Direct import (no TMDB) ----
          const { error: insertError } = await supabase.from('movies').insert({
            title,
            description: description || '',
            thumbnail: thumbnail || null,
            cover: null,
            video_url: embed_url || null,
            release_year: parseInt(year) || null,
            duration: '',
            rating: 'Livre',
            category: category || 'Sem Categoria',
            is_featured: false,
            is_release: false,
          });

          if (insertError) {
            results.push({ title, status: 'error', error: insertError.message });
          } else {
            results.push({ title, status: 'added' });
          }
        }
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
