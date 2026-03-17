export type KnownProvider = 'mixdrop' | 'doodstream' | 'streamtape' | 'redecanais' | 'unknown';

export function normalizeHttpUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function toIdEmbedUrl(origin: string, provider: KnownProvider, id: string) {
  switch (provider) {
    case 'mixdrop':
    case 'doodstream':
    case 'streamtape':
      return `${origin}/e/${id}`;
    default:
      return null;
  }
}

export function detectProvider(url: string): KnownProvider {
  try {
    const u = new URL(normalizeHttpUrl(url));
    const host = u.hostname.toLowerCase();
    if (host.includes('mixdrop')) return 'mixdrop';
    if (host.includes('dood') || host.includes('doodstream')) return 'doodstream';
    if (host.includes('streamtape') || host.includes('stape')) return 'streamtape';
    if (host.includes('redecanais')) return 'redecanais';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function toEmbedUrl(inputUrl: string): string | null {
  const url = normalizeHttpUrl(inputUrl);
  if (!url) return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const provider = detectProvider(url);
  const origin = u.origin;
  const path = u.pathname;

  if (provider === 'mixdrop') {
    const match = path.match(/^\/(?:f|d|v|embed)\/?([A-Za-z0-9]+)(?:\/|$)/i);
    if (match?.[1]) return toIdEmbedUrl(origin, provider, match[1]);
    if (path.match(/^\/e\//i)) return url;
  }

  if (provider === 'doodstream') {
    const match = path.match(/^\/(?:d|v|f|download|e)\/?([A-Za-z0-9]+)(?:\/|$)/i);
    if (match?.[1]) return toIdEmbedUrl(origin, provider, match[1]);
  }

  if (provider === 'streamtape') {
    const match = path.match(/^\/(?:v|e)\/?([A-Za-z0-9_\-]+)(?:\/|$)/i);
    if (match?.[1]) return toIdEmbedUrl(origin, provider, match[1]);
  }

  return null;
}

/** Returns true only for URLs that need server-side scraping to find the real embed.
 *  RedeCanais server.php player URLs are already embeddable iframes — skip them. */
export function shouldResolveRemotely(inputUrl: string): boolean {
  const url = normalizeHttpUrl(inputUrl);
  if (!url) return false;

  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    // RedeCanais server.php player URLs are direct iframe players — never resolve
    if (host.includes('redecanais') && path.includes('server.php')) return false;
    // RedeCanais /player/ or /player3/ paths with query params are also direct players
    if (host.includes('redecanais') && path.match(/\/player\d*\//)) return false;

    if (path.includes('redirect.php')) return true;
    if (host.includes('pobreflixtv')) return true;
    if (host.includes('redecanais')) return true;
    if (path.endsWith('.html') && detectProvider(url) === 'unknown') return true;

    return false;
  } catch {
    return false;
  }
}
