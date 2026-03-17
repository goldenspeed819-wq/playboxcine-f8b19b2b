import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

type ContentType = 'movie' | 'series';

function normalizeContentType(v: unknown): ContentType {
  return v === 'series' ? 'series' : 'movie';
}

function parseReleaseYear(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

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
    const { items, skipTmdb, contentType } = body;

    if (!items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: 'items array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    const useTmdb = !skipTmdb && !!TMDB_API_KEY;
    const defaultContentType = normalizeContentType(contentType);

    const results: any[] = [];

    for (const item of items) {
      const title = String(item?.title || '').trim();
      const year = item?.year;
      const embed_url = item?.embed_url ? String(item.embed_url) : null;
      const rowContentType = normalizeContentType(item?.content_type ?? defaultContentType);

      if (!title) {
        results.push({ title: 'Sem título', status: 'error', error: 'Título inválido' });
        continue;
      }

      try {
        if (rowContentType === 'movie') {
          const { data: existingMovie } = await supabase
            .from('movies')
            .select('id')
            .eq('title', title)
            .maybeSingle();

          if (existingMovie) {
            results.push({ title, status: 'exists' });
            continue;
          }

          if (useTmdb) {
            const yearParam = parseReleaseYear(year);
            const yearQuery = yearParam ? `&year=${yearParam}` : '';

            const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}${yearQuery}&page=1`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            let resultsList = searchData?.results || [];
            if (!resultsList.length) {
              const fallbackUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}&page=1`;
              const fallbackRes = await fetch(fallbackUrl);
              const fallbackData = await fallbackRes.json();
              resultsList = fallbackData?.results || [];
            }

            if (!resultsList.length) {
              results.push({ title, status: 'not_found' });
              continue;
            }

            const tmdbMovie = resultsList[0];
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
            } catch {
              // ignore content rating lookup failures
            }

            let duration = '';
            if (details.runtime) {
              const hours = Math.floor(details.runtime / 60);
              const mins = details.runtime % 60;
              duration = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
            }

            const tmdbCategory = details.genres?.map((g: any) => g.name).join(', ') || 'Sem Categoria';
            const finalTitle = details.title || title;

            const { data: existingByTmdbTitle } = await supabase
              .from('movies')
              .select('id')
              .eq('title', finalTitle)
              .maybeSingle();

            if (existingByTmdbTitle) {
              results.push({ title: finalTitle, status: 'exists' });
              continue;
            }

            const { error: insertError } = await supabase.from('movies').insert({
              title: finalTitle,
              description: details.overview || '',
              thumbnail: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE}/w500${tmdbMovie.poster_path}` : null,
              cover: tmdbMovie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${tmdbMovie.backdrop_path}` : null,
              video_url: embed_url,
              release_year: details.release_date ? new Date(details.release_date).getFullYear() : parseReleaseYear(year),
              duration,
              rating: contentRating,
              category: tmdbCategory,
              is_featured: false,
              is_release: false,
            });

            if (insertError) {
              results.push({ title: finalTitle, status: 'error', error: insertError.message });
            } else {
              results.push({ title: finalTitle, status: 'added' });
            }
          } else {
            const { error: insertError } = await supabase.from('movies').insert({
              title,
              description: '',
              thumbnail: null,
              cover: null,
              video_url: embed_url,
              release_year: parseReleaseYear(year),
              duration: '',
              rating: 'Livre',
              category: 'Sem Categoria',
              is_featured: false,
              is_release: false,
            });

            if (insertError) {
              results.push({ title, status: 'error', error: insertError.message });
            } else {
              results.push({ title, status: 'added' });
            }
          }
        } else {
          // series
          const { data: existingSeries } = await supabase
            .from('series')
            .select('id')
            .eq('title', title)
            .maybeSingle();

          if (existingSeries) {
            results.push({ title, status: 'exists' });
            continue;
          }

          if (useTmdb) {
            const yearParam = parseReleaseYear(year);
            const yearQuery = yearParam ? `&first_air_date_year=${yearParam}` : '';

            const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}${yearQuery}&page=1`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            let resultsList = searchData?.results || [];
            if (!resultsList.length) {
              const fallbackUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}&page=1`;
              const fallbackRes = await fetch(fallbackUrl);
              const fallbackData = await fallbackRes.json();
              resultsList = fallbackData?.results || [];
            }

            if (!resultsList.length) {
              results.push({ title, status: 'not_found' });
              continue;
            }

            const tmdbSeries = resultsList[0];
            const detailsUrl = `${TMDB_BASE_URL}/tv/${tmdbSeries.id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
            const detailsRes = await fetch(detailsUrl);
            const details = await detailsRes.json();

            const finalTitle = details.name || title;
            const tmdbCategory = details.genres?.map((g: any) => g.name).join(', ') || 'Sem Categoria';

            const { data: existingByTmdbTitle } = await supabase
              .from('series')
              .select('id')
              .eq('title', finalTitle)
              .maybeSingle();

            if (existingByTmdbTitle) {
              results.push({ title: finalTitle, status: 'exists' });
              continue;
            }

            const { error: insertError } = await supabase.from('series').insert({
              title: finalTitle,
              description: details.overview || '',
              thumbnail: tmdbSeries.poster_path ? `${TMDB_IMAGE_BASE}/w500${tmdbSeries.poster_path}` : null,
              release_year: details.first_air_date ? new Date(details.first_air_date).getFullYear() : parseReleaseYear(year),
              rating: 'Livre',
              category: tmdbCategory,
              is_featured: false,
              is_release: false,
            });

            if (insertError) {
              results.push({ title: finalTitle, status: 'error', error: insertError.message });
            } else {
              results.push({ title: finalTitle, status: 'added' });
            }
          } else {
            const { error: insertError } = await supabase.from('series').insert({
              title,
              description: '',
              thumbnail: null,
              release_year: parseReleaseYear(year),
              rating: 'Livre',
              category: 'Sem Categoria',
              is_featured: false,
              is_release: false,
            });

            if (insertError) {
              results.push({ title, status: 'error', error: insertError.message });
            } else {
              results.push({ title, status: 'added' });
            }
          }
        }
      } catch (err) {
        results.push({ title, status: 'error', error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ results, mode: useTmdb ? 'tmdb' : 'direct' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Bulk import error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
