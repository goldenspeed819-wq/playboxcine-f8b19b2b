import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type KnownProvider = 'mixdrop' | 'doodstream' | 'streamtape' | 'unknown';

function normalizeHttpUrl(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function isValidPublicHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (/\s/.test(input)) return false;

    const host = url.hostname.toLowerCase();
    if (!host || host.endsWith('.') || !host.includes('.')) return false;
    if (host === 'localhost' || host.endsWith('.localhost')) return false;

    const labels = host.split('.');
    const tld = labels[labels.length - 1] || '';
    if (labels.some((label) => !label)) return false;
    if (tld.length < 2 || !/^[a-z][a-z0-9-]*$/i.test(tld)) return false;
    if (/^(127|10|0)\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;

    return true;
  } catch {
    return false;
  }
}

function invalidUrlResponse() {
  return new Response(
    JSON.stringify({ success: false, error: 'URL inválida ou domínio incompleto' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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
  // links/buttons that open embed/player pages
  pushRegexMatches(/<a[^>]+href=["']([^"']*(?:embed|player|server\.php)[^"']*)["']/gi);
  pushRegexMatches(/data-(?:src|url|embed)=["']([^"']+)["']/gi);
  // video source
  pushRegexMatches(/<source[^>]+src=["']([^"']+)["']/gi);
  // JS assignments (file/src/source/embed: '...')
  pushRegexMatches(/(?:file|src|source|embed)\s*[:=]\s*["']([^"']+)["']/gi);
  // direct media links
  pushRegexMatches(/(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?)/gi);
  // known provider links
  pushRegexMatches(/(https?:\/\/[^\s"'<>]*(?:mixdrop|dood|streamtape|redecanais)[^\s"'<>]*)/gi);

  return [...new Set(candidates.filter(Boolean))];
}

function isLikelyBlockedChallengeHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return lower.includes('carregando...') && lower.includes('deu errado pra voce');
}

function extractDirectStreams(html: string, baseUrl: string): string[] {
  const found: string[] = [];
  const text = html.replace(/\\\//g, '/');

  const patterns = [
    /(https?:\/\/[^\s"'<>\\]+\.m3u8(?:\?[^\s"'<>\\]*)?)/gi,
    /(https?:\/\/[^\s"'<>\\]+\.mp4(?:\?[^\s"'<>\\]*)?)/gi,
    /(?:file|src|source)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
  ];

  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const raw = m[1];
      if (!raw) continue;
      try {
        found.push(new URL(raw, baseUrl).toString());
      } catch {
        // ignore
      }
    }
  }

  // prefer master playlists, then any m3u8, then mp4
  const unique = [...new Set(found)].filter((u) => !/\.ts(\?|$)/i.test(u));
  return unique.sort((a, b) => {
    const score = (u: string) =>
      /master\.m3u8/i.test(u) ? 0 : /\.m3u8/i.test(u) ? 1 : 2;
    return score(a) - score(b);
  });
}

function proxyUrl(stream: string, referer: string): string {
  const base = Deno.env.get('SUPABASE_URL') || '';
  return `${base}/functions/v1/stream-proxy?url=${encodeURIComponent(stream)}&referer=${encodeURIComponent(referer)}`;
}

/**
 * Resolvedor externo (tools/rynex-resolver): abre a página num navegador real,
 * passa pelo Cloudflare e devolve o stream direto. Mesma lógica da extensão,
 * porém fora do navegador do usuário.
 */
async function resolveViaExternalResolver(
  pageUrl: string,
): Promise<{ stream: string; referer: string } | null> {
  const endpoint = (Deno.env.get('RESOLVER_URL') || '').trim();
  if (!endpoint) return null;

  const token = (Deno.env.get('RESOLVER_TOKEN') || '').trim();
  const base = endpoint.replace(/\/+$/, '');
  const url = /\/resolve$/.test(base) ? base : `${base}/resolve`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-resolver-token': token } : {}),
      },
      body: JSON.stringify({ url: pageUrl }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    if (!data?.success || !data?.stream) return null;

    let referer = data.referer as string | undefined;
    if (!referer) {
      try {
        referer = new URL(pageUrl).origin + '/';
      } catch {
        referer = '';
      }
    }

    return { stream: String(data.stream), referer: referer || '' };
  } catch {
    return null;
  }
}

/** RedeCanais mirrors bounce through google.com/url?...&q=<encoded real url> */
function unwrapGoogleRedirect(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('google.') || !u.pathname.startsWith('/url')) return null;
    const q = u.searchParams.get('q') || u.searchParams.get('url');
    if (!q) return null;
    let decoded = q;
    for (let i = 0; i < 3 && decoded.includes('%'); i++) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        break;
      }
    }
    return /^https?:\/\//i.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}


function iframeSrcs(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)) {
    try {
      out.push(new URL(m[1], baseUrl).toString());
    } catch {
      // ignore
    }
  }
  return [...new Set(out)];
}

/** Fetches a page (and up to one nested iframe level) looking for a direct .m3u8/.mp4 stream. */
async function findDirectStream(pageUrl: string, depth = 0): Promise<{ stream: string; referer: string } | null> {
  if (depth > 3) return null;

  try {
    const u = new URL(pageUrl);
    const resp = await fetchPage(pageUrl, { 'Referer': `${u.protocol}//${u.host}/` });
    const finalUrl = resp.url || pageUrl;

    const unwrapped = unwrapGoogleRedirect(finalUrl);
    if (unwrapped) return await findDirectStream(unwrapped, depth + 1);

    if (/\.(m3u8|mp4)(\?|$)/i.test(finalUrl)) {
      return { stream: finalUrl, referer: `${u.protocol}//${u.host}/` };
    }

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await resp.text();

    // meta refresh / JS location redirects
    const redirectMatch =
      html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i) ||
      html.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
    if (redirectMatch?.[1]) {
      try {
        const next = new URL(redirectMatch[1].trim(), finalUrl).toString();
        if (next !== finalUrl) {
          const viaRedirect = await findDirectStream(next, depth + 1);
          if (viaRedirect) return viaRedirect;
        }
      } catch {
        // ignore
      }
    }

    const streams = extractDirectStreams(html, finalUrl);
    if (streams.length > 0) {
      return { stream: streams[0], referer: new URL(finalUrl).origin + '/' };
    }

    for (const frame of iframeSrcs(html, finalUrl)) {
      if (isChallengeOrBlockedUrl(frame)) continue;
      const nested = await findDirectStream(frame, depth + 1);
      if (nested) return nested;
    }

    return null;
  } catch {
    return null;
  }
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

    if (!input || !isValidPublicHttpUrl(input)) {
      return invalidUrlResponse();
    }

    // 0) Try to find a direct stream so the native Rynex player can be used
    if (/\.(m3u8|mp4)(\?|$)/i.test(input)) {
      return new Response(
        JSON.stringify({ success: true, directUrl: input, streamUrl: input, resolvedUrl: input }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const direct = (await resolveViaExternalResolver(input)) ?? (await findDirectStream(input));
    if (direct) {
      return new Response(
        JSON.stringify({
          success: true,
          directUrl: direct.stream,
          streamUrl: proxyUrl(direct.stream, direct.referer),
          resolvedUrl: input,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    let resp: Response;
    try {
      resp = await fetchPage(input);
    } catch {
      return invalidUrlResponse();
    }
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
