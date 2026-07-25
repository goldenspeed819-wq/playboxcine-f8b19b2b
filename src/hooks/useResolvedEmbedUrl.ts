import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeHttpUrl, shouldResolveRemotely, toEmbedUrl } from '@/utils/externalEmbeds';

type State = {
  url: string | null;
  streamUrl: string | null;
  isLoading: boolean;
  error: string | null;
};

// Guards against resolving half-typed URLs (e.g. "https://h//site.com/...")
function isResolvableUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname.includes('.') && !/\s/.test(hostname);
  } catch {
    return false;
  }
}

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
    if (!input || !isResolvableUrl(input)) {
      setState({ url: null, streamUrl: null, isLoading: false, error: null });
      return;
    }

    const needsRemote = shouldResolveRemotely(input);
    const localEmbed = toEmbedUrl(input) ?? input;

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

    // Always try remotely: we want a direct stream so the native player can be used.
    // While resolving, keep the local embed available as fallback when it already works.
    setState({ url: needsRemote ? null : localEmbed, streamUrl: null, isLoading: true, error: null });

    const timer = setTimeout(() => void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('resolve-video-url', {
          body: { url: input },
        });

        if (controller.signal.aborted) return;

        if (error) {
          setState({ url: needsRemote ? null : localEmbed, streamUrl: null, isLoading: false, error: needsRemote ? error.message : null });
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

        if (!needsRemote) {
          setState({ url: localEmbed, streamUrl: null, isLoading: false, error: null });
          return;
        }

        const backendError = data?.error || 'Não foi possível resolver o link para reprodução incorporada';
        setState({ url: null, streamUrl: null, isLoading: false, error: backendError });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({ url: needsRemote ? null : localEmbed, streamUrl: null, isLoading: false, error: needsRemote ? String(e) : null });
      }
    })(), 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [rawUrl]);

  return state;
}
