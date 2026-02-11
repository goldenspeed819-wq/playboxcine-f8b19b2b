export type KnownProvider = 'mixdrop' | 'doodstream' | 'streamtape' | 'unknown';

export function normalizeHttpUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  // If user pasted without protocol
  return `https://${trimmed}`;
}

function toIdEmbedUrl(origin: string, provider: KnownProvider, id: string) {
  switch (provider) {
    case 'mixdrop':
      return `${origin}/e/${id}`;
    case 'doodstream':
      return `${origin}/e/${id}`;
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
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Best-effort conversion of a provider URL to an embeddable URL.
 * This does NOT bypass protections; it only normalizes common URL patterns.
 */
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

  // Mixdrop patterns: /f/{id}, /d/{id} -> /e/{id}
  if (provider === 'mixdrop') {
    const m = path.match(/^\/(?:f|d|v|embed)\/?([A-Za-z0-9]+)(?:\/|$)/i);
    if (m?.[1]) return toIdEmbedUrl(origin, provider, m[1]);
    if (path.match(/^\/e\//i)) return url;
  }

  // Doodstream patterns: /d/{id}, /v/{id} -> /e/{id}
  if (provider === 'doodstream') {
    const m = path.match(/^\/(?:d|v|f|download|e)\/?([A-Za-z0-9]+)(?:\/|$)/i);
    if (m?.[1]) return toIdEmbedUrl(origin, provider, m[1]);
  }

  // Streamtape patterns: /v/{id} -> /e/{id}
  if (provider === 'streamtape') {
    const m = path.match(/^\/(?:v|e)\/?([A-Za-z0-9_\-]+)(?:\/|$)/i);
    if (m?.[1]) return toIdEmbedUrl(origin, provider, m[1]);
  }

  return null;
}

/**
 * Some URLs are known redirectors (e.g. redirect.php) that usually need backend resolution.
 */
export function shouldResolveRemotely(inputUrl: string): boolean {
  const url = normalizeHttpUrl(inputUrl);
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    if (path.includes('redirect.php')) return true;
    // Some sites wrap providers behind /e/redirect.php
    if (host.includes('pobreflixtv') && path.includes('/e/')) return true;

    return false;
  } catch {
    return false;
  }
}
