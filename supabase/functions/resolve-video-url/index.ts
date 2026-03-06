import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type KnownProvider = 'mixdrop' | 'doodstream' | 'streamtape' | 'unknown';

function normalizeHttpUrl(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function detectProvider(url: string): KnownProvider {
  try {
    const u = new URL(normalizeHttpUrl(url));
    const host = u.hostname.toLowerCase();
    if (host.includes('mixdrop')) return 'mixdrop';
    if (host.includes('dood') || host.includes('doodstream')) return 'doodstream';
    if (host.includes('streamtape') || host.includes('stape')) return 'streamtape';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function toEmbedUrl(inputUrl: string): { embedUrl: string | null; provider: KnownProvider } {
  const url = normalizeHttpUrl(inputUrl);
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { embedUrl: null, provider: 'unknown' };
  }

  const provider = detectProvider(url);
  const origin = u.origin;
  const path = u.pathname;

  const idFromPath = (re: RegExp) => {
    const m = path.match(re);
    return m?.[1] ?? null;
  };

  if (provider === 'mixdrop') {
    if (path.match(/^\/e\//i)) return { embedUrl: url, provider };
    const id = idFromPath(/^\/(?:f|d|v|embed)\/?([A-Za-z0-9]+)(?:\/|$)/i);
    if (id) return { embedUrl: `${origin}/e/${id}`, provider };
  }

  if (provider === 'doodstream') {
    const id = idFromPath(/^\/(?:d|v|f|download|e)\/?([A-Za-z0-9]+)(?:\/|$)/i);
    if (id) return { embedUrl: `${origin}/e/${id}`, provider };
  }

  if (provider === 'streamtape') {
    const id = idFromPath(/^\/(?:v|e)\/?([A-Za-z0-9_\-]+)(?:\/|$)/i);
    if (id) return { embedUrl: `${origin}/e/${id}`, provider };
  }

  return { embedUrl: null, provider };
}

function extractCandidatesFromHtml(html: string): string[] {
  const candidates: string[] = [];

  const pushRegexMatches = (re: RegExp) => {
    for (const m of html.matchAll(re)) {
      if (m[1]) candidates.push(m[1]);
    }
  };

  // iframe/src
  pushRegexMatches(/<iframe[^>]+src=["']([^"']+)["']/gi);
  // video source
  pushRegexMatches(/<source[^>]+src=["']([^"']+)["']/gi);
  // JS assignments (file/src/source: '...')
  pushRegexMatches(/(?:file|src|source)\s*[:=]\s*["']([^"']+)["']/gi);
  // direct media links
  pushRegexMatches(/(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?)/gi);
  // known provider links
  pushRegexMatches(/(https?:\/\/[^\s"'<>]*(?:mixdrop|dood|streamtape)[^\s"'<>]*)/gi);

  return [...new Set(candidates.filter(Boolean))];
}

function isLikelyBlockedChallengeHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return lower.includes('carregando...') && lower.includes('deu errado pra voce');
}

async function fetchPage(url: string, extraHeaders: Record<string, string> = {}) {
  return fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      ...extraHeaders,
    },
  });
}

function isChallengeOrBlockedUrl(url: string): boolean {
  return /\/cdn-cgi\/challenge-platform\//i.test(url);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json().catch(() => ({ url: '' }));
    const input = normalizeHttpUrl(url);

    if (!input || (!input.startsWith('http://') && !input.startsWith('https://'))) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1) Try local normalization first
    const directNormalized = toEmbedUrl(input);
    if (directNormalized.embedUrl) {
      return new Response(
        JSON.stringify({ success: true, embedUrl: directNormalized.embedUrl, provider: directNormalized.provider, resolvedUrl: directNormalized.embedUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2) Fetch page and follow redirects server-side
    let resp = await fetchPage(input);
    let resolvedUrl = resp.url || input;

    const normalizedFinal = toEmbedUrl(resolvedUrl);
    if (normalizedFinal.embedUrl && !isChallengeOrBlockedUrl(normalizedFinal.embedUrl)) {
      return new Response(
        JSON.stringify({ success: true, embedUrl: normalizedFinal.embedUrl, provider: normalizedFinal.provider, resolvedUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = resp.headers.get('content-type') || '';
    let html = contentType.includes('text/html') ? await resp.text() : '';

    // Retry with referer/origin for sources that gate content by headers
    if (html && isLikelyBlockedChallengeHtml(html)) {
      try {
        const u = new URL(input);
        const retry = await fetchPage(input, {
          'Referer': `${u.protocol}//${u.host}/`,
          'Origin': `${u.protocol}//${u.host}`,
        });

        if (retry.ok) {
          const retryType = retry.headers.get('content-type') || '';
          if (retryType.includes('text/html')) {
            html = await retry.text();
            resolvedUrl = retry.url || resolvedUrl;
          }
        }
      } catch {
        // ignore retry errors
      }
    }

    // 3) Parse HTML looking for iframe/source/media candidates
    if (html) {
      const candidates = extractCandidatesFromHtml(html);

      for (const candidate of candidates) {
        try {
          const abs = new URL(candidate, resolvedUrl).toString();
          if (isChallengeOrBlockedUrl(abs)) continue;

          const normalizedCandidate = toEmbedUrl(abs);
          const finalUrl = normalizedCandidate.embedUrl || abs;
          if (isChallengeOrBlockedUrl(finalUrl)) continue;

          return new Response(
            JSON.stringify({
              success: true,
              embedUrl: finalUrl,
              provider: normalizedCandidate.provider,
              resolvedUrl,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch {
          // continue
        }
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível resolver uma URL embed para este link', resolvedUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
