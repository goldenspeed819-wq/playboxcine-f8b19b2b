import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StreamServer = { name: string; movie: string; tv: string };

export const STREAM_SERVERS_KEY = 'stream_servers';

export function parseServers(value: string | null | undefined): StreamServer[] {
  try {
    const arr = JSON.parse(value || '[]');
    return Array.isArray(arr)
      ? arr.filter((s) => s && typeof s.name === 'string').map((s) => ({ name: s.name, movie: s.movie || '', tv: s.tv || '' }))
      : [];
  } catch {
    return [];
  }
}

export function buildServerUrl(
  tpl: string,
  ids: { imdb?: string | null; tmdb?: number | null; season?: number; episode?: number },
): string | null {
  if (!tpl) return null;
  if (tpl.includes('{imdb}') && !ids.imdb) return null;
  if (tpl.includes('{tmdb}') && !ids.tmdb) return null;
  return tpl
    .replace(/\{imdb\}/g, ids.imdb || '')
    .replace(/\{tmdb\}/g, String(ids.tmdb ?? ''))
    .replace(/\{season\}/g, String(ids.season ?? 1))
    .replace(/\{episode\}/g, String(ids.episode ?? 1));
}

const imdbCache = new Map<string, string | null>();

export function useStreamServers(tmdbId: number | null | undefined, type: 'movie' | 'tv') {
  const [servers, setServers] = useState<StreamServer[]>([]);
  const [imdbId, setImdbId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', STREAM_SERVERS_KEY).maybeSingle()
      .then(({ data }) => setServers(parseServers(data?.value)));
  }, []);

  useEffect(() => {
    setImdbId(null);
    if (!tmdbId) return;
    const k = `${type}:${tmdbId}`;
    if (imdbCache.has(k)) { setImdbId(imdbCache.get(k) ?? null); return; }
    supabase.functions.invoke('imdb-lookup', { body: { tmdb_id: tmdbId, type } }).then(({ data }) => {
      const v = data?.imdb_id ?? null;
      imdbCache.set(k, v);
      setImdbId(v);
    });
  }, [tmdbId, type]);

  return { servers, imdbId };
}
