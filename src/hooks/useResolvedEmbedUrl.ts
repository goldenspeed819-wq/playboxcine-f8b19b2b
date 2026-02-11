import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeHttpUrl, shouldResolveRemotely, toEmbedUrl } from '@/utils/externalEmbeds';

type State = {
  url: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useResolvedEmbedUrl(rawUrl: string | null | undefined): State {
  const cacheRef = useRef<Map<string, string>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<State>({
    url: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const input = rawUrl ? normalizeHttpUrl(rawUrl) : '';
    if (!input) {
      setState({ url: null, isLoading: false, error: null });
      return;
    }

    const localEmbed = toEmbedUrl(input) ?? input;
    setState({ url: localEmbed, isLoading: false, error: null });

    if (!shouldResolveRemotely(input)) return;

    const cached = cacheRef.current.get(input);
    if (cached) {
      setState({ url: cached, isLoading: false, error: null });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const { data, error } = await supabase.functions.invoke('resolve-video-url', {
          body: { url: input },
        });

        if (controller.signal.aborted) return;

        if (error) {
          setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
          return;
        }

        const embedUrl: string | undefined = data?.embedUrl;
        if (embedUrl) {
          cacheRef.current.set(input, embedUrl);
          setState({ url: embedUrl, isLoading: false, error: null });
          return;
        }

        // If backend can't resolve, keep local URL
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (e) {
        if (controller.signal.aborted) return;
        setState((prev) => ({ ...prev, isLoading: false, error: String(e) }));
      }
    })();

    return () => {
      controller.abort();
    };
  }, [rawUrl]);

  return state;
}
