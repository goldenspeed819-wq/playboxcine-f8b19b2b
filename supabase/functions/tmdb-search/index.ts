import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  runtime?: number;
}

interface TMDBSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBGenre {
  id: number;
  name: string;
}

const movieGenres: Record<number, string> = {
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  14: 'Fantasia',
  36: 'História',
  27: 'Terror',
  10402: 'Música',
  9648: 'Mistério',
  10749: 'Romance',
  878: 'Ficção Científica',
  10770: 'Cinema TV',
  53: 'Thriller',
  10752: 'Guerra',
  37: 'Faroeste',
};

const tvGenres: Record<number, string> = {
  10759: 'Ação e Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  10762: 'Kids',
  9648: 'Mistério',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Faroeste',
};

async function parseRequest(req: Request) {
  const url = new URL(req.url);
  const contentType = req.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await req.json().catch(() => ({}))
    : {};

  const action = body.action ?? url.searchParams.get('action');
  const query = body.query ?? url.searchParams.get('query');
  const id = body.id ?? body.tmdbId ?? url.searchParams.get('id');
  const type = body.type ?? url.searchParams.get('type') ?? 'movie';
  const season = body.season ?? url.searchParams.get('season');

  const inferredAction = action || (query ? 'search' : id ? 'details' : null);
  return {
    action: inferredAction,
    query,
    id: id ? String(id) : null,
    type: String(type),
    season: season ? Number(season) : null,
  };
}

function mapSearchResults(data: any, type: string) {
  return (data.results || []).slice(0, 10).map((item: TMDBMovie | TMDBSeries) => {
    const isMovie = type === 'movie';
    const title = isMovie ? (item as TMDBMovie).title : (item as TMDBSeries).name;
    const originalTitle = isMovie ? (item as TMDBMovie).original_title : (item as TMDBSeries).original_name;
    const releaseDate = isMovie ? (item as TMDBMovie).release_date : (item as TMDBSeries).first_air_date;
    const genreMap = isMovie ? movieGenres : tvGenres;

    return {
      id: item.id,
      title,
      originalTitle,
      overview: item.overview,
      posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : null,
      backdropUrl: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null,
      releaseYear: releaseDate ? new Date(releaseDate).getFullYear() : null,
      rating: item.vote_average,
      genres: item.genre_ids.map((genreId) => genreMap[genreId]).filter(Boolean),
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');

    if (!TMDB_API_KEY) {
      return new Response(JSON.stringify({ error: 'TMDB API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, query, id, type } = await parseRequest(req);
    console.log(`TMDB request: action=${action}, query=${query}, id=${id}, type=${type}`);

    if (action === 'search' && query) {
      const searchUrl = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`;
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.status_message || 'TMDB API error');
      }

      return new Response(JSON.stringify({ results: mapSearchResults(data, type) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'details' && id) {
      const detailsUrl = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.status_message || 'TMDB API error');
      }

      const isMovie = type === 'movie';
      const title = isMovie ? data.title : data.name;
      const originalTitle = isMovie ? data.original_title : data.original_name;
      const releaseDate = isMovie ? data.release_date : data.first_air_date;

      let contentRating = 'Livre';
      if (isMovie) {
        const releaseInfoUrl = `${TMDB_BASE_URL}/movie/${id}/release_dates?api_key=${TMDB_API_KEY}`;
        const releaseResponse = await fetch(releaseInfoUrl);
        const releaseData = await releaseResponse.json();
        const brRelease = releaseData.results?.find((item: any) => item.iso_3166_1 === 'BR');
        if (brRelease?.release_dates?.[0]?.certification) {
          const certification = brRelease.release_dates[0].certification;
          contentRating = certification === 'L' ? 'Livre' : `${certification}+`;
        }
      } else {
        const ratingsUrl = `${TMDB_BASE_URL}/tv/${id}/content_ratings?api_key=${TMDB_API_KEY}`;
        const ratingsResponse = await fetch(ratingsUrl);
        const ratingsData = await ratingsResponse.json();
        const brRating = ratingsData.results?.find((item: any) => item.iso_3166_1 === 'BR');
        if (brRating?.rating) {
          const certification = brRating.rating;
          contentRating = certification === 'L' ? 'Livre' : `${certification}+`;
        }
      }

      let duration = '';
      if (isMovie && data.runtime) {
        const hours = Math.floor(data.runtime / 60);
        const mins = data.runtime % 60;
        duration = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
      } else if (!isMovie && data.episode_run_time?.length) {
        duration = `${data.episode_run_time[0]}min/ep`;
      }

      return new Response(
        JSON.stringify({
          id: data.id,
          title,
          originalTitle,
          overview: data.overview,
          posterUrl: data.poster_path ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}` : null,
          backdropUrl: data.backdrop_path ? `${TMDB_IMAGE_BASE}/original${data.backdrop_path}` : null,
          releaseYear: releaseDate ? new Date(releaseDate).getFullYear() : null,
          rating: data.vote_average,
          contentRating,
          duration,
          genres: data.genres?.map((genre: TMDBGenre) => genre.name) || [],
          numberOfSeasons: data.number_of_seasons || null,
          numberOfEpisodes: data.number_of_episodes || null,
          seasons: Array.isArray(data.seasons)
            ? data.seasons.map((season: any) => ({
                season_number: season.season_number,
                episode_count: season.episode_count,
                name: season.name,
              }))
            : [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use action=search&query=... or action=details&id=...' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('TMDB function error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
