export function normalizeSeriesBaseCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/(?:R)?T\d{2}EP\d{2}$/i, '');
}

export function buildSeriesEpisodeCode(abbreviation: string, season: number, episode: number): string {
  const base = normalizeSeriesBaseCode(abbreviation);
  if (!base) return '';

  const seasonStr = String(season).padStart(2, '0');
  const episodeStr = String(episode).padStart(2, '0');
  return `${base}T${seasonStr}EP${episodeStr}`;
}

export function normalizeRedeCanaisUrl(input: string | null | undefined): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const isProtocolRelative = trimmed.startsWith('//');
  const normalizedInput = isProtocolRelative
    ? `https:${trimmed}`
    : /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

  try {
    const url = new URL(normalizedInput);
    const host = url.hostname.toLowerCase();

    if (!host.includes('redecanais')) {
      return isProtocolRelative ? normalizedInput.replace(/^https?:/i, '') : normalizedInput;
    }

    const vid = url.searchParams.get('vid');
    if (vid) {
      url.searchParams.set('vid', vid.replace(/RT(?=\d{2}EP\d{2}$)/i, 'T'));
    }

    const normalized = url.toString();
    return isProtocolRelative ? normalized.replace(/^https?:/i, '') : normalized;
  } catch {
    return trimmed;
  }
}
