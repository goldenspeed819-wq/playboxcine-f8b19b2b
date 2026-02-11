import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function extractFirstIframeSrc(html: string): string | null {
  const m = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

function extractFirstSourceSrc(html: string): string | null {
  const m = html.match(/<source[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
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

    // 2) Follow redirects server-side (avoids browser CORS issues)
    const resp = await fetch(input, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const resolvedUrl = resp.url || input;

    // 3) If the final URL is a known provider, normalize to embed
    const normalizedFinal = toEmbedUrl(resolvedUrl);
    if (normalizedFinal.embedUrl) {
      return new Response(
        JSON.stringify({ success: true, embedUrl: normalizedFinal.embedUrl, provider: normalizedFinal.provider, resolvedUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4) Last resort: parse HTML and look for iframe/src hints
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await resp.text();
      const iframeSrc = extractFirstIframeSrc(html);
      const sourceSrc = extractFirstSourceSrc(html);

      const candidate = iframeSrc || sourceSrc;
      if (candidate) {
        const abs = new URL(candidate, resolvedUrl).toString();
        const normalizedCandidate = toEmbedUrl(abs);
        return new Response(
          JSON.stringify({
            success: true,
            embedUrl: normalizedCandidate.embedUrl || abs,
            provider: normalizedCandidate.provider,
            resolvedUrl,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
