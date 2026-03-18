import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!TMDB_API_KEY) {
      return new Response(JSON.stringify({ error: 'TMDB_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all series with tmdb_id
    const { data: seriesList, error: seriesError } = await supabase
      .from('series')
      .select('id, title, tmdb_id')
      .not('tmdb_id', 'is', null);

    if (seriesError) throw seriesError;
    if (!seriesList || seriesList.length === 0) {
      return new Response(JSON.stringify({ message: 'No series with TMDB ID found', added: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalAdded = 0;
    const results: { series: string; added: number; errors: string[] }[] = [];

    for (const series of seriesList) {
      const seriesResult = { series: series.title, added: 0, errors: [] as string[] };

      try {
        // Get TMDB series details
        const tmdbRes = await fetch(
          `${TMDB_BASE}/tv/${series.tmdb_id}?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        const tmdbData = await tmdbRes.json();

        if (!tmdbData.seasons) {
          seriesResult.errors.push('No seasons found on TMDB');
          results.push(seriesResult);
          continue;
        }

        // Get existing episodes
        const { data: existingEps } = await supabase
          .from('episodes')
          .select('season, episode')
          .eq('series_id', series.id);

        const existingSet = new Set(
          (existingEps || []).map(e => `${e.season}-${e.episode}`)
        );

        // Check each season for new episodes
        for (const season of tmdbData.seasons) {
          if (season.season_number === 0) continue;

          // Get season details for episode info
          const seasonRes = await fetch(
            `${TMDB_BASE}/tv/${series.tmdb_id}/season/${season.season_number}?api_key=${TMDB_API_KEY}&language=pt-BR`
          );
          const seasonData = await seasonRes.json();

          if (!seasonData.episodes) continue;

          const newEpisodes: any[] = [];

          for (const ep of seasonData.episodes) {
            const key = `${season.season_number}-${ep.episode_number}`;
            if (existingSet.has(key)) continue;

            // Build video URL using the pattern - we need to figure out the abbreviation
            // For auto-added episodes, we'll try to match existing episode URL patterns
            let videoUrl: string | null = null;

            // Try to detect URL pattern from existing episodes
            if (existingEps && existingEps.length > 0) {
              const { data: sampleEp } = await supabase
                .from('episodes')
                .select('video_url')
                .eq('series_id', series.id)
                .not('video_url', 'is', null)
                .limit(1)
                .single();

              if (sampleEp?.video_url) {
                // Extract pattern and replace season/episode numbers
                const url = sampleEp.video_url;
                const vidMatch = url.match(/vid=([A-Z0-9]+?)T(\d{2,3})EP(\d{2,3})/i);
                if (vidMatch) {
                  const base = vidMatch[1];
                  const padLen = vidMatch[2].length;
                  const epPadLen = vidMatch[3].length;
                  const newSeason = String(season.season_number).padStart(padLen, '0');
                  const newEpisode = String(ep.episode_number).padStart(epPadLen, '0');
                  videoUrl = url.replace(
                    /vid=([A-Z0-9]+?)T\d{2,3}EP\d{2,3}/i,
                    `vid=${base}T${newSeason}EP${newEpisode}`
                  );
                }
              }
            }

            const thumbnail = ep.still_path ? `${TMDB_IMG}${ep.still_path}` : null;

            newEpisodes.push({
              series_id: series.id,
              season: season.season_number,
              episode: ep.episode_number,
              title: ep.name || `Episódio ${ep.episode_number}`,
              description: ep.overview || null,
              thumbnail,
              video_url: videoUrl,
            });
          }

          if (newEpisodes.length > 0) {
            const { error: insertError } = await supabase
              .from('episodes')
              .insert(newEpisodes);

            if (insertError) {
              seriesResult.errors.push(`Season ${season.season_number}: ${insertError.message}`);
            } else {
              seriesResult.added += newEpisodes.length;
              totalAdded += newEpisodes.length;
            }
          }
        }
      } catch (err) {
        seriesResult.errors.push(String(err));
      }

      results.push(seriesResult);

      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({ 
      message: `Checked ${seriesList.length} series, added ${totalAdded} new episodes`,
      added: totalAdded,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
