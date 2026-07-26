/**
 * Resolvedor local (rynex-resolver rodando no PC do usuário em http://localhost:8791).
 * Navegadores permitem chamadas HTTPS -> http://localhost / http://127.0.0.1
 * (origens consideradas seguras), então não é necessário nenhum túnel.
 */

const CANDIDATES = ['http://127.0.0.1:8791', 'http://localhost:8791'];
const AVAILABILITY_TTL = 30_000;

let availability: { at: number; base: string | null; error: string | null } | null = null;

export type LocalResolveResult = {
  stream: string;
  referer?: string;
};

export type ResolverDiagnostics = {
  ok: boolean;
  base: string | null;
  error: string | null;
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

/** Descobre (com cache curto) qual endereço do resolvedor local responde. */
export async function getLocalResolverBase(force = false): Promise<ResolverDiagnostics> {
  if (!force && availability && Date.now() - availability.at < AVAILABILITY_TTL) {
    return { ok: !!availability.base, base: availability.base, error: availability.error };
  }
  let base: string | null = null;
  let error: string | null = null;

  for (const candidate of CANDIDATES) {
    try {
      const res = await fetchWithTimeout(candidate, { method: 'GET', mode: 'cors' }, 2500);
      if (res.ok) {
        base = candidate;
        error = null;
        break;
      }
      error = `${candidate} respondeu ${res.status}`;
    } catch (e) {
      error = `${candidate}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  availability = { at: Date.now(), base, error };
  return { ok: !!base, base, error };
}

export async function isLocalResolverUp(): Promise<boolean> {
  return (await getLocalResolverBase()).ok;
}

/** Tenta extrair o stream direto usando o resolvedor local. Retorna null se indisponível. */
export async function resolveWithLocalResolver(
  url: string,
  signal?: AbortSignal,
): Promise<LocalResolveResult | null> {
  const { base } = await getLocalResolverBase();
  if (!base) return null;
  try {
    const res = await fetchWithTimeout(
      `${base}/resolve`,
      {
        method: 'POST',
        // text/plain evita o preflight (CORS simple request)
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ url }),
      },
      90_000,
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

/** Teste manual usado no painel de diagnóstico. */
export async function testLocalResolver(url: string): Promise<{ ok: boolean; detail: string }> {
  const status = await getLocalResolverBase(true);
  if (!status.base) return { ok: false, detail: status.error || 'Resolvedor não respondeu' };
  try {
    const res = await fetchWithTimeout(
      `${status.base}/resolve`,
      { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ url }) },
      90_000,
    );
    const data = await res.json().catch(() => null);
    if (data?.success && data.stream) return { ok: true, detail: data.stream };
    return { ok: false, detail: data?.error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export { CANDIDATES as LOCAL_RESOLVER_URLS };
