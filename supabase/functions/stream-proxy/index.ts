const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
};

function selfBase(req: Request) {
  const u = new URL(req.url);
  return `${u.origin}${u.pathname}`;
}

function proxied(req: Request, target: string, referer: string) {
  const base = selfBase(req);
  return `${base}?url=${encodeURIComponent(target)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
}

function rewritePlaylist(text: string, baseUrl: string, req: Request, referer: string) {
  const abs = (u: string) => {
    try { return new URL(u, baseUrl).toString(); } catch { return u; }
  };

  return text
    .split('\n')
    .map((rawLine) => {
      const line = rawLine.trim();
      if (!line) return rawLine;

      if (line.startsWith('#')) {
        // rewrite URI="..." attributes (keys, media, i-frame playlists)
        return rawLine.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${proxied(req, abs(u), referer)}"`);
      }

      return proxied(req, abs(line), referer);
    })
    .join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get('url');
  const referer = url.searchParams.get('referer') || '';

  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response(JSON.stringify({ error: 'URL inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Accept': '*/*',
  };

  if (referer) {
    headers['Referer'] = referer;
    try { headers['Origin'] = new URL(referer).origin; } catch { /* ignore */ }
  }

  const range = req.headers.get('range');
  if (range) headers['Range'] = range;

  try {
    const upstream = await fetch(target, { headers, redirect: 'follow' });
    const contentType = upstream.headers.get('content-type') || '';
    const finalUrl = upstream.url || target;
    const isPlaylist =
      /\.m3u8(\?|$)/i.test(finalUrl) ||
      contentType.includes('mpegurl') ||
      contentType.includes('vnd.apple.mpegurl');

    if (isPlaylist) {
      const text = await upstream.text();
      return new Response(rewritePlaylist(text, finalUrl, req, referer), {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
        },
      });
    }

    const out = new Headers(corsHeaders);
    for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control']) {
      const value = upstream.headers.get(key);
      if (value) out.set(key, value);
    }

    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
