import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isResolvableHttpUrl, normalizeHttpUrl, shouldResolveRemotely, toEmbedUrl } from '@/utils/externalEmbeds';
import { resolveWithLocalResolver } from '@/utils/localResolver';

type State = {
  url: string | null;
  streamUrl: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useResolvedEmbedUrl(rawUrl: string | null | undefined): State {
  const cacheRef = useRef<Map<string, string>>(new Map());
  const streamCacheRef = useRef<Map<string, string>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<State>({
    url: null,
    streamUrl: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const input = rawUrl ? normalizeHttpUrl(rawUrl) : '';
    if (!input || !isResolvableHttpUrl(input)) {
      setState({ url: null, streamUrl: null, isLoading: false, error: null });
      return;
    }

    const needsRemote = shouldResolveRemotely(input);
    const localEmbed = toEmbedUrl(input) ?? input;

    if (!needsRemote) {
      cacheRef.current.set(input, localEmbed);
      setState({ url: localEmbed, streamUrl: null, isLoading: false, error: null });
      return;
    }

    // Cached results
    const cachedStream = streamCacheRef.current.get(input);
    if (cachedStream) {
      setState({ url: cacheRef.current.get(input) ?? localEmbed, streamUrl: cachedStream, isLoading: false, error: null });
      return;
    }

    const cached = cacheRef.current.get(input);
    if (cached && !needsRemote) {
      setState({ url: cached, streamUrl: null, isLoading: false, error: null });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState({ url: null, streamUrl: null, isLoading: true, error: null });

    const timer = setTimeout(() => void (async () => {
      try {
        // 1) Resolvedor local (http://localhost:8791) — sem túnel, roda no PC do usuário
        const local = await resolveWithLocalResolver(input, controller.signal);
        if (controller.signal.aborted) return;
        if (local?.stream) {
          streamCacheRef.current.set(input, local.stream);
          setState({ url: cacheRef.current.get(input) ?? localEmbed, streamUrl: local.stream, isLoading: false, error: null });
          return;
        }

        // 2) Fallback: resolver no backend
        const { data, error } = await supabase.functions.invoke('resolve-video-url', {
          body: { url: input },
        });

        if (controller.signal.aborted) return;

        if (error) {
          setState({ url: null, streamUrl: null, isLoading: false, error: error.message });
          return;
        }

        const streamUrl: string | undefined = data?.streamUrl;
        if (streamUrl) {
          streamCacheRef.current.set(input, streamUrl);
          setState({ url: cacheRef.current.get(input) ?? localEmbed, streamUrl, isLoading: false, error: null });
          return;
        }

        const embedUrl: string | undefined = data?.embedUrl;
        if (embedUrl && !embedUrl.includes('/cdn-cgi/challenge-platform/')) {
          cacheRef.current.set(input, embedUrl);
          setState({ url: embedUrl, streamUrl: null, isLoading: false, error: null });
          return;
        }

        const backendError = data?.error || 'Não foi possível resolver o link para reprodução incorporada';
        setState({ url: null, streamUrl: null, isLoading: false, error: backendError });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({ url: null, streamUrl: null, isLoading: false, error: String(e) });
      }
    })(), 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [rawUrl]);

  return state;
}
