/**
 * Resolvedor local (rynex-resolver rodando no PC do usuário em http://localhost:8791).
 * Navegadores permitem chamadas HTTPS -> http://localhost (origem considerada segura),
 * então não é necessário nenhum túnel.
 */

const LOCAL_RESOLVER_URL = 'http://localhost:8791';
const AVAILABILITY_TTL = 30_000;

let availability: { at: number; ok: boolean } | null = null;

export type LocalResolveResult = {
  stream: string;
  referer?: string;
};

async function fetchWithTimeout(input: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Verifica (com cache curto) se o resolvedor local está no ar. */
export async function isLocalResolverUp(): Promise<boolean> {
  if (availability && Date.now() - availability.at < AVAILABILITY_TTL) return availability.ok;
  let ok = false;
  try {
    const res = await fetchWithTimeout(LOCAL_RESOLVER_URL, { method: 'GET' }, 1500);
    ok = res.ok;
  } catch {
    ok = false;
  }
  availability = { at: Date.now(), ok };
  return ok;
}

/** Tenta extrair o stream direto usando o resolvedor local. Retorna null se indisponível. */
export async function resolveWithLocalResolver(
  url: string,
  signal?: AbortSignal,
): Promise<LocalResolveResult | null> {
  if (!(await isLocalResolverUp())) return null;
  try {
    const res = await fetchWithTimeout(
      `${LOCAL_RESOLVER_URL}/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      },
      60_000,
    );
    if (signal?.aborted) return null;
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && typeof data.stream === 'string') {
      return { stream: data.stream, referer: data.referer };
    }
    return null;
  } catch {
    return null;
  }
}

export { LOCAL_RESOLVER_URL };
