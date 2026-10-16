import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Hls from 'hls.js';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  ChevronRight,
  PictureInPicture2,
  Rewind,
  FastForward,
  AlertCircle,
  RectangleHorizontal,
  Subtitles,
  MessageSquareOff,
  Server,
  MoreHorizontal,
  AudioLines,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useSubtitleStyles } from '@/hooks/useSubtitleStyles';
import { useOptionalRemoteControl } from '@/contexts/RemoteControlContext';

/**
 * Os menus são renderizados DENTRO do player (e não no <body>).
 * Assim eles aparecem e funcionam também em tela cheia.
 */
const PlayerPortalContext = createContext<HTMLElement | null>(null);

const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, collisionPadding = 8, ...props }, ref) => {
  const container = useContext(PlayerPortalContext);
  return (
    <DropdownMenuPrimitive.Portal container={container ?? undefined}>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'z-[200] overflow-hidden rounded-md border shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = 'PlayerDropdownMenuContent';

const SERVERS_COLLAPSED_COUNT = 3;

interface SubtitleTrack {
  id: string;
  language: string;
  subtitle_url: string;
}

interface VideoPlayerProps {
  src: string | null;
  poster?: string | null;
  title?: string;
  subtitles?: SubtitleTrack[];
  nextLabel?: string;
  onNextClick?: () => void;
  introStartTime?: number | null;
  introEndTime?: number | null;
  onTimeUpdate?: (currentTime: number, duration?: number) => void;
  initialTime?: number;
  onEnded?: () => void;
  /** Gera um link novo na hora quando todos os servidores falham. Retorna true se achou. */
  onRefreshSource?: () => Promise<boolean>;
  servers?: {
    name: string;
    url: string;
    dub?: boolean;
    quality?: string;
    type?: string;
  }[] | null;
  /** Sinopse exibida no card inferior */
  overview?: string | null;
  /** Gêneros/categorias exibidos no card inferior */
  genres?: string[] | null;
  /** Duração (minutos ou texto, ex: "2h 10min") */
  runtime?: number | string | null;
}

/**
 * Proxy customizado para HLS.js.
 *
 * Intercepta TODAS as requisições feitas pelo HLS.js:
 * - Master Playlist
 * - Media Playlists / sub-playlists
 * - Segmentos .ts
 * - Outros recursos requisitados pelo HLS
 *
 * Assim, depois que o Master Playlist é carregado, as URLs internas
 * também passam pelo stream-proxy do Supabase.
 */
export class ProxyLoader extends (Hls.DefaultConfig.loader as any) {
  load(
    context: any,
    config: any,
    callbacks: any
  ) {
    const originalUrl = context.url;

    if (!isProxied(originalUrl)) {
      const proxied = buildProxyUrl(originalUrl);

      if (proxied) context.url = proxied;
    }

    return super.load(context, config, callbacks);
  }
}

/** True se a URL já passa pelo stream-proxy do Supabase. */
export function isProxied(url: string): boolean {
  return (
    url.includes('/functions/v1/stream-proxy') ||
    url.includes('stream-proxy?url=')
  );
}

/**
 * Monta a URL do stream-proxy. A URL original inteira (com todos os ? e &,
 * como file=, referer=, token=) vai em encodeURIComponent para chegar íntegra.
 */
export function buildProxyUrl(url: string): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  if (!projectId) return null;

  return `https://${projectId}.supabase.co/functions/v1/stream-proxy?url=${encodeURIComponent(
    url
  )}`;
}

const MAX_NETWORK_RETRIES = 3;
const MAX_MEDIA_RETRIES = 2;

/**
 * Detecta URLs HLS por "includes" (não por extensão no fim): pega .m3u8 no meio
 * da URL (…&file=master.m3u8&referer=…), hls.php, e as que passam pelo
 * stream-proxy (URL original codificada dentro de ?url=…).
 */
const HLS_HINT = /m3u8|hls\.php|\/hls\/|[?&](?:type|format|output|fmt)=hls/i;

export function isHlsUrl(url: string): boolean {
  if (!url) return false;

  if (HLS_HINT.test(url)) return true;

  try {
    return HLS_HINT.test(decodeURIComponent(url));
  } catch {
    return false;
  }
}

export function VideoPlayer({
  src: rawSrc,
  servers,
  poster,
  title,
  subtitles = [],
  nextLabel,
  onNextClick,
  introStartTime,
  introEndTime,
  onTimeUpdate,
  initialTime,
  onEnded,
  onRefreshSource,
  overview,
  genres,
  runtime,
}: VideoPlayerProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshedForRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [serversExpanded, setServersExpanded] = useState(false);
  useEffect(() => {
    setPortalEl(containerRef.current);
  }, []);
  const hlsRef = useRef<Hls | null>(null);
  const resumeRef = useRef(0);
  // Apply "continue from" even when the video had already loaded before the user chose it
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !initialTime || initialTime <= 0) return;
    if (v.readyState >= 1) {
      v.currentTime = initialTime;
    }
  }, [initialTime]);
  const lastVolumeRef = useRef(1);
  // Último volume/mudo escolhido pelo usuário (fonte da verdade)
  const desiredRef = useRef<{ volume: number; muted: boolean } | null>(null);
  const hoverVolumeRef = useRef(false);
  const guardRef = useRef({ count: 0, since: 0 });
  const hlsRetryRef = useRef({ network: 0, media: 0 });
  const hlsTriedRef = useRef<Set<string>>(new Set());
  // Pré-visualização da barra de progresso (miniatura + tempo)
  const previewRef = useRef<HTMLVideoElement>(null);
  const pendingPreviewRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Só faz upgrade para HTTPS em hosts com nome.
  // IPs diretos podem servir somente HTTP.
  const upgrade = (u: string) =>
    u.startsWith('http://') &&
    !/^http:\/\/\d{1,3}(\.\d{1,3}){3}(:|\/|$)/.test(u)
      ? 'https://' + u.slice(7)
      : u;

  const seen = new Set<string>();

  const serverList = [
    ...(rawSrc
      ? [
          {
            name: 'Principal',
            url: rawSrc,
          } as NonNullable<VideoPlayerProps['servers']>[number],
        ]
      : []),
    ...(servers || []),
  ].filter(
    (x) =>
      x?.url &&
      /^https?:/.test(x.url) &&
      !seen.has(x.url) &&
      seen.add(x.url)
  );

    const candidates: string[] = [];
  const serverStart: number[] = [];

  serverList.forEach((sv) => {
    serverStart.push(candidates.length);

    const isHttp = sv.url.startsWith('http://');
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

    // Se a página é HTTPS e o stream é HTTP puro (sem SSL), passa direto pelo proxy seguro
    if (isHttp && isHttpsPage) {
      const proxied = buildProxyUrl(sv.url);
      if (proxied) candidates.push(proxied);
      // Mantém a URL direta como fallback
      candidates.push(sv.url);
    } else {
      candidates.push(sv.url);
      if (!isProxied(sv.url)) {
        const proxied = buildProxyUrl(sv.url);
        if (proxied) candidates.push(proxied);
      }
    }
  });

  const [candIdx, setCandIdx] = useState(0);

  const candKey = candidates.join('|');

  useEffect(() => {
    setCandIdx(0);
    hlsTriedRef.current.clear();
    setHlsFallback(null);
  }, [candKey]);

  const src = candidates[candIdx] ?? null;

  const activeServer = serverStart.reduce(
    (acc, start, i) => (candIdx >= start ? i : acc),
    0
  );

  const selectServer = (i: number) => {
    resumeRef.current = videoRef.current?.currentTime || 0;
    setCandIdx(serverStart[i] ?? 0);
    setVideoError(null);
    setIsLoading(true);
  };

  const serverLabel = (
    sv: {
      name: string;
      dub?: boolean;
      quality?: string;
      type?: string;
      provider?: string;
    },
    i: number
  ) => {
    const lang =
      sv.type === 'legendado'
        ? 'Legendado'
        : sv.type === 'dublado' || sv.dub
          ? 'Dublado'
          : '';

    const provider =
      (sv as { provider?: string }).provider ||
      (sv.name || '').replace(/\s+(4K|\d{3,4}p|DUB)\b.*$/i, '').trim() ||
      'Servidor';
    return [`Provedor ${i + 1}: ${provider}`, lang, sv.quality].filter(Boolean).join(' - ');
  };

  const candRef = useRef({ idx: 0, len: 0 });

  candRef.current = {
    idx: candIdx,
    len: candidates.length,
  };

  const failOrNext = (msg: string) => {
    const { idx, len } = candRef.current;

    if (idx < len - 1) {
      resumeRef.current = videoRef.current?.currentTime || 0;
      setCandIdx(idx + 1);
      setVideoError(null);
      setIsLoading(true);
    } else if (onRefreshSource && refreshedForRef.current !== (title || '')) {
      // Link expirado/quebrado: re-extrai este título agora, enquanto o player espera.
      refreshedForRef.current = title || '';
      resumeRef.current = videoRef.current?.currentTime || 0;
      setRefreshing(true);
      setVideoError(null);
      setIsLoading(false);
      onRefreshSource()
        .then((ok) => { if (!ok) setVideoError('Nenhuma fonte disponível agora. Tente mais tarde.'); })
        .catch(() => setVideoError(msg))
        .finally(() => setRefreshing(false));
    } else {
      setVideoError(msg);
      setIsLoading(false);
    }
  };

  const { getSubtitleCSS } = useSubtitleStyles();
  const remote = useOptionalRemoteControl();

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [canSetVolume, setCanSetVolume] = useState(true);
  const [showServers, setShowServers] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isStretched, setIsStretched] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [isCinema, setIsCinema] = useState(false);

  // Avisa o site que o player está em modo cinema (tela cheia pelo controle):
  // o CSS esconde o menu e as barras do site.
  useEffect(() => {
    if (isCinema) {
      document.body.classList.add('cinema-mode');
    } else {
      document.body.classList.remove('cinema-mode');
    }
    return () => {
      document.body.classList.remove('cinema-mode');
    };
  }, [isCinema]);

  // URL sem cara de HLS que o <video> não abriu e que vamos tentar com hls.js
  const [hlsFallback, setHlsFallback] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    x: number;
    time: number;
    width: number;
  } | null>(null);
  // A miniatura só começa a carregar no primeiro hover (economiza banda)
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Inject subtitle styles
  useEffect(() => {
    const styleId = 'subtitle-custom-styles';

    let styleElement = document.getElementById(
      styleId
    ) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = getSubtitleCSS();

    return () => {
      // O estilo é compartilhado e permanece disponível.
    };
  }, [getSubtitleCSS]);

  // Reset states when src changes
  useEffect(() => {
    setVideoError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
  }, [src]);

  // Volume: detecta se o navegador permite mudar o volume (iOS ignora)
  // e mantém o estado React sempre sincronizado com o <video>.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prev = video.volume;
    try {
      video.volume = 0.5;
      setCanSetVolume(Math.abs(video.volume - 0.5) < 0.01);
    } catch {
      setCanSetVolume(false);
    }
    video.volume = prev;

    const sync = () => {
      const want = desiredRef.current;

      // Se algo externo mudou o volume/mudo sem o usuário pedir,
      // reaplica o que o usuário escolheu (com limite para não entrar em loop).
      if (want && !document.pictureInPictureElement) {
        const off =
          Math.abs(video.volume - want.volume) > 0.01 ||
          video.muted !== want.muted;

        if (off) {
          const now = Date.now();
          const g = guardRef.current;

          if (now - g.since > 1000) {
            g.since = now;
            g.count = 0;
          }

          if (g.count < 5) {
            g.count += 1;
            video.volume = want.volume;
            video.muted = want.muted;
            return;
          }
        }
      }

      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
      if (video.volume > 0) lastVolumeRef.current = video.volume;
    };

    sync();
    video.addEventListener('volumechange', sync);

    return () => video.removeEventListener('volumechange', sync);
  }, [src]);

  // Volume: mantém o slider aberto enquanto o usuário arrasta,
  // mesmo que o mouse saia da área do botão.
  useEffect(() => {
    if (!isDraggingVolume) return;

    const end = () => {
      setIsDraggingVolume(false);

      if (!hoverVolumeRef.current) setShowVolume(false);
    };

    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [isDraggingVolume]);

  // Pré-visualização: um segundo <video> escondido, em baixa qualidade,
  // que pula para o tempo sob o mouse e mostra o frame na miniatura.
  useEffect(() => {
    if (!previewEnabled || !src) return;

    const pv = previewRef.current;

    if (!pv) return;

    setPreviewReady(false);

    let hls: Hls | null = null;

    const onLoadedMetadata = () => {
      const t = pendingPreviewRef.current;

      if (t != null) pv.currentTime = t;
    };

    const onLoadedData = () => setPreviewReady(true);

    const onSeeked = () => {
      const t = pendingPreviewRef.current;

      if (t != null && Math.abs(pv.currentTime - t) > 0.5) {
        pv.currentTime = t;
      }
    };

    const onError = () => setPreviewReady(false);

    pv.addEventListener('loadedmetadata', onLoadedMetadata);
    pv.addEventListener('loadeddata', onLoadedData);
    pv.addEventListener('seeked', onSeeked);
    pv.addEventListener('error', onError);

    const isHls = isHlsUrl(src) || hlsFallback === src;

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          startLevel: 0,
          capLevelToPlayerSize: true,

          // Buffer mínimo: só o suficiente para mostrar o frame
          maxBufferLength: 2,
          maxMaxBufferLength: 4,
          backBufferLength: 0,

          fLoader: ProxyLoader as any,
          pLoader: ProxyLoader as any,
        });

        const instance = hls;

        instance.loadSource(src);
        instance.attachMedia(pv);

        // Sempre a menor qualidade (nível 0)
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          instance.currentLevel = 0;
        });

        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          // Sem miniatura; o tempo continua aparecendo normalmente.
          setPreviewReady(false);
          instance.destroy();

          if (hls === instance) hls = null;
        });
      } else if (pv.canPlayType('application/vnd.apple.mpegurl')) {
        pv.src = src;
      }
    } else {
      pv.src = src;
    }

    return () => {
      pv.removeEventListener('loadedmetadata', onLoadedMetadata);
      pv.removeEventListener('loadeddata', onLoadedData);
      pv.removeEventListener('seeked', onSeeked);
      pv.removeEventListener('error', onError);

      if (hls) {
        hls.destroy();
        hls = null;
      }

      pv.removeAttribute('src');
      pv.load();

      setPreviewReady(false);
    };
  }, [previewEnabled, src, hlsFallback]);

  // Painel de provedores: fecha com Esc
  useEffect(() => {
    if (!showServers) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowServers(false);
    };

    document.addEventListener('keydown', onKey);

    return () => document.removeEventListener('keydown', onKey);
  }, [showServers]);

  // Enquanto o painel está aberto, os controles não somem sozinhos
  useEffect(() => {
    if (showServers) {
      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [showServers]);

  // Watchdog: se a fonte não começar em 8s, pula para a próxima (nada de spinner infinito).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    let ok = false;
    const mark = () => { ok = true; };
    video.addEventListener('loadedmetadata', mark);
    video.addEventListener('canplay', mark);
    const t = setTimeout(() => { if (!ok) failOrNext('Servidor não respondeu'); }, 8000);
    return () => {
      clearTimeout(t);
      video.removeEventListener('loadedmetadata', mark);
      video.removeEventListener('canplay', mark);
    };
  }, [src, hlsFallback]);

  // HLS.js support
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !src) return;

    // Limpa a instância anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    hlsRetryRef.current = { network: 0, media: 0 };

    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const isHls = isHlsUrl(src) || hlsFallback === src;

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,

          // Retentativas internas do hls.js antes de reportar erro fatal
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 4,

          // Intercepta loaders de arquivos e playlists.
          fLoader: ProxyLoader as any,
          pLoader: ProxyLoader as any,
        });

        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setVideoError(null);
        });

        // Fragmento carregado = conexão saudável → zera os contadores
        hls.on(Hls.Events.FRAG_LOADED, () => {
          hlsRetryRef.current.network = 0;
          hlsRetryRef.current.media = 0;
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          const retry = hlsRetryRef.current;

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              const status = data.response?.code ?? 0;

              // 4xx (exceto 408/429) = recurso inexistente/proibido:
              // tentar de novo não ajuda, vai direto para o próximo servidor.
              const permanent =
                status >= 400 &&
                status < 500 &&
                status !== 408 &&
                status !== 429;

              if (!permanent && retry.network < MAX_NETWORK_RETRIES) {
                retry.network += 1;

                // Backoff: 1s, 2s, 4s
                const delay = 1000 * 2 ** (retry.network - 1);

                setIsLoading(true);

                retryTimer = setTimeout(() => {
                  try {
                    hls.startLoad();
                  } catch {
                    failOrNext('Erro de rede ao carregar o stream HLS');
                  }
                }, delay);
              } else {
                failOrNext('Erro de rede ao carregar o stream HLS');
              }

              break;
            }

            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retry.media < MAX_MEDIA_RETRIES) {
                retry.media += 1;

                try {
                  // Na 2ª tentativa troca o codec de áudio antes de recuperar
                  if (retry.media === 2) hls.swapAudioCodec();

                  hls.recoverMediaError();
                } catch {
                  failOrNext('Erro de mídia no stream HLS');
                }
              } else {
                failOrNext('Erro de mídia no stream HLS');
              }

              break;

            default:
              failOrNext('Erro fatal ao reproduzir o stream');

              hls.destroy();

              if (hlsRef.current === hls) {
                hlsRef.current = null;
              }

              break;
          }
        });
      } else if (
        video.canPlayType('application/vnd.apple.mpegurl')
      ) {
        // Suporte nativo a HLS (Safari/iOS)
        video.src = src;
      } else {
        setVideoError('Seu navegador não suporta reprodução de HLS');
        setIsLoading(false);
      }
    } else {
      // Vídeo direto (.mp4, .webm, ...)
      video.src = src;
    }

    return () => {
      if (retryTimer) clearTimeout(retryTimer);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.removeAttribute('src');
      video.load();
    };
  }, [src, hlsFallback]);

  // Intro
  useEffect(() => {
    const hasIntro =
      introStartTime != null && introEndTime != null;

    if (
      hasIntro &&
      currentTime >= introStartTime &&
      currentTime < introEndTime
    ) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
  }, [currentTime, introStartTime, introEndTime]);

  // Next episode
  useEffect(() => {
    if (onNextClick && duration > 0) {
      const timeRemaining = duration - currentTime;
      const percentComplete = (currentTime / duration) * 100;

      setShowNextButton(
        percentComplete >= 90 || timeRemaining <= 30
      );
    } else {
      setShowNextButton(false);
    }
  }, [currentTime, duration, onNextClick]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;

      setCurrentTime(current);

      if (video.duration && isFinite(video.duration)) {
        setProgress((current / video.duration) * 100);
      }

      onTimeUpdate?.(current, video.duration);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setVideoError(null);

      if (resumeRef.current > 0) {
        video.currentTime = resumeRef.current;
        resumeRef.current = 0;

        video.play().catch(() => {});
      } else if (initialTime && initialTime > 0) {
        video.currentTime = initialTime;
      }
    };

    const handleProgress = () => {
      if (
        video.buffered.length > 0 &&
        video.duration &&
        isFinite(video.duration)
      ) {
        setBuffered(
          (video.buffered.end(video.buffered.length - 1) /
            video.duration) *
            100
        );
      }
    };

    const handlePlay = () => setIsPlaying(true);

    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleLeavePiP = () => setIsPiP(false);

    const handleEnterPiP = () => setIsPiP(true);

    const handleCanPlay = () => {
      setIsLoading(false);
      setVideoError(null);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleError = () => {
      const error = video.error;

      let errorMessage = 'Erro ao carregar o vídeo';

      if (error) {
        switch (error.code) {
          case 1:
            errorMessage =
              'Carregamento do vídeo foi interrompido';
            break;

          case 2:
            errorMessage =
              'Erro de rede ao carregar o vídeo';
            break;

          case 3:
            errorMessage =
              'Formato de vídeo não suportado pelo navegador';
            break;

          case 4:
            errorMessage =
              'Vídeo não encontrado ou inacessível';
            break;
        }
      }

      // URL sem cara de HLS que o <video> não conseguiu abrir (erro 3/4):
      // tenta uma vez com hls.js antes de desistir deste servidor.
      if (
        src &&
        (error?.code === 3 || error?.code === 4) &&
        !isHlsUrl(src) &&
        !hlsTriedRef.current.has(src) &&
        Hls.isSupported()
      ) {
        hlsTriedRef.current.add(src);
        setHlsFallback(src);
        setIsLoading(true);
        return;
      }

      failOrNext(errorMessage);
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener(
      'loadedmetadata',
      handleLoadedMetadata
    );
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener(
      'leavepictureinpicture',
      handleLeavePiP
    );
    video.addEventListener(
      'enterpictureinpicture',
      handleEnterPiP
    );
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener(
        'loadedmetadata',
        handleLoadedMetadata
      );
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener(
        'leavepictureinpicture',
        handleLeavePiP
      );
      video.removeEventListener(
        'enterpictureinpicture',
        handleEnterPiP
      );
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);
    };
  }, [src, onTimeUpdate, initialTime]);

  // Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen =
        !!document.fullscreenElement;

      setIsFullscreen(isNowFullscreen);

      if (!isNowFullscreen) {
        try {
          if (
            screen.orientation &&
            'unlock' in screen.orientation
          ) {
            (
              screen.orientation as ScreenOrientation & {
                unlock?: () => void;
              }
            ).unlock?.();
          }
        } catch {
          // Ignore
        }
      }
    };

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange
    );

    return () =>
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying && !showServers) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const isMobile = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768
    );
  };

  const lockLandscape = async () => {
    try {
      if (
        screen.orientation &&
        'lock' in screen.orientation
      ) {
        await (
          screen.orientation as ScreenOrientation & {
            lock?: (
              orientation:
                | 'any'
                | 'natural'
                | 'landscape'
                | 'portrait'
                | 'portrait-primary'
                | 'portrait-secondary'
                | 'landscape-primary'
                | 'landscape-secondary'
            ) => Promise<void>;
          }
        ).lock?.('landscape');
      }
    } catch {
      console.log(
        'Screen orientation lock not available'
      );
    }
  };

  const unlockOrientation = () => {
    try {
      if (
        screen.orientation &&
        'unlock' in screen.orientation
      ) {
        (
          screen.orientation as ScreenOrientation & {
            unlock?: () => void;
          }
        ).unlock?.();
      }
    } catch {
      // Ignore
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      try {
        await video.play();
      } catch {
        return;
      }

      if (!isFullscreen && container) {
        try {
          await container.requestFullscreen?.();

          if (isMobile()) {
            await lockLandscape();
          }
        } catch {
          console.log(
            'Fullscreen request failed'
          );
        }
      }
    }
  };

  const seekPreview = (time: number) => {
    const pv = previewRef.current;

    pendingPreviewRef.current = time;

    // Evita empilhar seeks: o 'seeked' reaplica o último tempo pedido.
    if (!pv || pv.readyState < 1 || pv.seeking) return;

    pv.currentTime = time;
  };

  const handleProgressHover = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!duration || !isFinite(duration)) return;

    const rect = e.currentTarget.getBoundingClientRect();

    if (!rect.width) return;

    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const time = (x / rect.width) * duration;

    setHoverPreview({ x, time, width: rect.width });

    if (!previewEnabled) setPreviewEnabled(true);

    seekPreview(time);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;

    if (!video || !duration) return;

    const newTime = (value[0] / 100) * duration;

    video.currentTime = newTime;
    setProgress(value[0]);
  };

  // Ponto único para mudar o volume (slider, controle remoto, etc.)
  const applyVolume = (value: number) => {
    const video = videoRef.current;

    if (!video) return;

    const next = Math.min(1, Math.max(0, value));

    desiredRef.current = { volume: next, muted: next === 0 };

    video.volume = next;
    video.muted = next === 0;

    if (next > 0) lastVolumeRef.current = next;

    setVolume(next);
    setIsMuted(next === 0);
  };

  const handleVolumeChange = (value: number[]) => {
    applyVolume(value[0] / 100);
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.muted || video.volume === 0) {
      // Se o volume estava em 0, volta para o último volume usado.
      if (video.volume === 0) {
        video.volume = lastVolumeRef.current || 1;
      }

      video.muted = false;
    } else {
      video.muted = true;
    }

    desiredRef.current = { volume: video.volume, muted: video.muted };

    setIsMuted(video.muted || video.volume === 0);
    setVolume(video.volume);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;

    if (!container) return;

    if (!isFullscreen) {
      try {
        await container.requestFullscreen?.();

        if (isMobile()) {
          await lockLandscape();
        }
      } catch {
        console.log(
          'Fullscreen request failed'
        );
      }
    } else {
      unlockOrientation();
      document.exitFullscreen?.();
    }
  };

  const toggleStretch = () => {
    setIsStretched((prev) => !prev);
  };

  const togglePiP = async () => {
    const video = videoRef.current;

    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (
        document.pictureInPictureEnabled &&
        typeof video.requestPictureInPicture === 'function'
      ) {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;

    if (!video) return;

    video.currentTime = Math.max(
      0,
      Math.min(
        video.currentTime + seconds,
        duration || Infinity
      )
    );
  };

  const skipIntro = () => {
    const video = videoRef.current;

    if (!video || introEndTime == null) return;

    video.currentTime = introEndTime;
  };

  const changePlaybackSpeed = (speed: number) => {
    const video = videoRef.current;

    if (!video) return;

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  // Remote control integration
  const remoteFullscreen = useCallback(async () => {
    const container = containerRef.current;

    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      setIsCinema(false);
      return;
    }

    try {
      await container.requestFullscreen?.();
      setIsCinema(false);
    } catch {
      setIsCinema((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    if (!remote) return;

    return remote.registerPlayer({
      togglePlay: () => {
        const video = videoRef.current;

        if (!video) return;

        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },

      play: () => {
        videoRef.current?.play().catch(() => {});
      },

      pause: () => {
        videoRef.current?.pause();
      },

      seek: (seconds) => skip(seconds),

      seekTo: (seconds) => {
        const video = videoRef.current;

        if (video) {
          video.currentTime = Math.max(0, seconds);
        }
      },

      setVolume: (value) => {
        applyVolume(value);
      },

      volumeDelta: (delta) => {
        const video = videoRef.current;

        if (!video) return;

        applyVolume(video.volume + delta);
      },

      toggleMute: () => toggleMute(),

      toggleFullscreen: () => {
        void remoteFullscreen();
      },

      togglePiP: () => {
        void togglePiP();
      },

      setSpeed: (speed) =>
        changePlaybackSpeed(speed),

      skipIntro: () => skipIntro(),

      next: () => onNextClick?.(),

      getState: () => {
        const video = videoRef.current;

        return {
          title,
          isPlaying: video ? !video.paused : false,
          currentTime: video?.currentTime ?? 0,
          duration:
            video && isFinite(video.duration)
              ? video.duration
              : 0,
          volume: video?.volume ?? 1,
          isMuted: video?.muted ?? false,
          isFullscreen:
            !!document.fullscreenElement ||
            isCinema,
          speed: video?.playbackRate ?? 1,
          hasNext: !!onNextClick,
          hasIntro: introEndTime != null,
        };
      },
    });
  }, [
    remote,
    remoteFullscreen,
    title,
    onNextClick,
    introEndTime,
    isCinema,
  ]);

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) {
      return '0:00';
    }

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor(
      (time % 3600) / 60
    );
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return VolumeX;
    }

    if (volume < 0.5) {
      return Volume1;
    }

    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  // ===== Relógio, gestos e atalhos (layout Apple TV+) =====
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const [seekRipple, setSeekRipple] = useState<{ side: 'left' | 'right'; key: number } | null>(null);
  const [centerFlash, setCenterFlash] = useState<{ playing: boolean; key: number } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'center' | 'right' } | null>(null);

  useEffect(() => {
    if (!seekRipple) return;
    const t = setTimeout(() => setSeekRipple(null), 700);
    return () => clearTimeout(t);
  }, [seekRipple]);

  useEffect(() => {
    if (!centerFlash) return;
    const t = setTimeout(() => setCenterFlash(null), 600);
    return () => clearTimeout(t);
  }, [centerFlash]);

  const flashPlayPause = () => {
    const video = videoRef.current;
    // Mostra o estado para o qual o vídeo VAI
    setCenterFlash({ playing: video ? video.paused : true, key: Date.now() });
    void togglePlay();
  };

  const handleGestureClick = (e: ReactMouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    if ('button' in e && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const side: 'left' | 'center' | 'right' = x < 0.35 ? 'left' : x > 0.65 ? 'right' : 'center';
    const now = Date.now();
    const last = lastTapRef.current;

    handleMouseMove();
    containerRef.current?.focus({ preventScroll: true });

    if (last && now - last.time < 400 && side !== 'center' && last.side === side) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      lastTapRef.current = null;
      skip(side === 'left' ? -10 : 10);
      setSeekRipple({ side, key: now });
      return;
    }

    lastTapRef.current = { time: now, side };
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    // No celular, o 1º toque com controles escondidos só mostra os controles.
    const touchOnly = isMobile() && !showControls && isPlaying;
    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null;
      if (touchOnly) return;
      flashPlayPause();
    }, 300);
  };

  const selectSubtitle = (sub: SubtitleTrack | null) => {
    setActiveSubtitle(sub ? sub.id : null);
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = sub && video.textTracks[i].label === sub.language ? 'showing' : 'hidden';
    }
  };

  const handlePlayerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, [role="slider"], [role="menu"]')) return;
    const video = videoRef.current;
    if (!video) return;
    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        flashPlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skip(-10);
        setSeekRipple({ side: 'left', key: Date.now() });
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(10);
        setSeekRipple({ side: 'right', key: Date.now() });
        break;
      case 'ArrowUp':
        e.preventDefault();
        applyVolume(Math.min(1, video.volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        applyVolume(Math.max(0, video.volume - 0.1));
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        void toggleFullscreen();
        break;
      default:
        return;
    }
    handleMouseMove();
  };

  if (!src) {
    return (
      <div className="video-player-container flex items-center justify-center bg-black/90 rounded-xl">
        <div className="text-center">
          <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />

          <p className="text-muted-foreground">
            Nenhum vídeo disponível
          </p>
        </div>
      </div>
    );
  }

  // ===== Novo layout Apple TV+ / Stremio =====
  const activeSv = serverList[activeServer] as
    | { name?: string; quality?: string; dub?: boolean }
    | undefined;
  const resolutionLabel = activeSv?.quality || null;
  const formatLabel =
    activeSv?.dub === true ? 'DUB' : activeSv?.dub === false ? 'LEG' : null;
  const runtimeLabel =
    runtime != null && runtime !== ''
      ? typeof runtime === 'number'
        ? `${Math.floor(runtime / 60) > 0 ? `${Math.floor(runtime / 60)}h ` : ''}${runtime % 60}min`
        : String(runtime)
      : duration > 0
        ? formatTime(duration)
        : null;
  const metaItems = [
    runtimeLabel,
    genres && genres.length > 0 ? genres.slice(0, 2).join(' · ') : null,
    resolutionLabel,
    formatLabel,
    serverList.length > 0 && activeSv ? serverLabel(activeSv as any, activeServer) : null,
  ].filter(Boolean) as string[];
  const remaining = Math.max(0, duration - currentTime);
  const controlsVisible = showControls || !isPlaying;
  const allServers = serverList.map((sv, i) => ({ sv, i }));
  const visibleServers =
    serversExpanded || serverList.length <= SERVERS_COLLAPSED_COUNT
      ? allServers
      : (() => {
          const first = allServers.slice(0, SERVERS_COLLAPSED_COUNT);
          // garante que o servidor ativo sempre aparece mesmo minimizado
          if (activeServer >= SERVERS_COLLAPSED_COUNT && allServers[activeServer]) first.push(allServers[activeServer]);
          return first;
        })();

  return (
    <PlayerPortalContext.Provider value={portalEl}>
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handlePlayerKeyDown}
      className={cn(
        'video-player-container group relative overflow-hidden bg-black w-full aspect-video max-w-full outline-none select-none',
        isCinema ? 'fixed inset-0 z-[100] rounded-none' : 'rounded-xl',
        !controlsVisible && 'cursor-none'
      )}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      onMouseLeave={() => isPlaying && !showServers && setShowControls(false)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        poster={poster || undefined}
        className={cn(
          'relative z-0 w-full h-full bg-black',
          isStretched ? 'object-cover' : 'object-contain'
        )}
        controls={false}
        playsInline
        autoPlay
        crossOrigin={subtitles.length > 0 ? 'anonymous' : undefined}
      >
        {subtitles.map((sub) => (
          <track
            key={sub.id}
            kind="subtitles"
            label={sub.language}
            src={sub.subtitle_url}
            srcLang={sub.language.toLowerCase().slice(0, 2)}
            default={activeSubtitle === sub.id}
          />
        ))}
      </video>

      {/* Camada de gestos: 1 toque = play/pause, 2 toques = ±10s */}
      <div
        className="absolute inset-0 z-[1]"
        style={{ touchAction: 'manipulation' }}
        onPointerUp={handleGestureClick}
        onDoubleClick={(e) => e.preventDefault()}
      />

      {/* Ripples de ±10s */}
      {seekRipple && (
        <div
          key={seekRipple.key}
          className={cn(
            'pointer-events-none absolute top-0 bottom-0 z-[2] flex w-1/3 items-center justify-center',
            seekRipple.side === 'left' ? 'left-0 rounded-r-[50%]' : 'right-0 rounded-l-[50%]'
          )}
          style={{ animation: 'rynexRipple 0.7s ease-out forwards', background: 'rgba(255,255,255,0.12)' }}
        >
          <div className="flex flex-col items-center gap-1 text-white">
            {seekRipple.side === 'left' ? <Rewind className="h-8 w-8" /> : <FastForward className="h-8 w-8" />}
            <span className="text-sm font-semibold tabular-nums">
              {seekRipple.side === 'left' ? '-10s' : '+10s'}
            </span>
          </div>
        </div>
      )}

      {/* Ícone central que aparece e some */}
      {centerFlash && (
        <div
          key={centerFlash.key}
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md"
            style={{ animation: 'rynexFlash 0.6s ease-out forwards' }}
          >
            {centerFlash.playing ? (
              <Play className="ml-1 h-9 w-9" fill="currentColor" />
            ) : (
              <Pause className="h-9 w-9" fill="currentColor" />
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes rynexRipple { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes rynexFlash { 0% { opacity: 0; transform: scale(0.7); } 30% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.25); } }
      `}</style>

      {refreshing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="text-center p-6 space-y-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white font-medium">Gerando um link novo para você...</p>
            <p className="text-white/60 text-sm">Isso leva de 5 a 20 segundos.</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && !videoError && !refreshing && (
        <div className="absolute inset-0 z-[3] flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {videoError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-destructive font-medium mb-2">{videoError}</p>
            <p className="text-muted-foreground text-sm">
              Verifique se o vídeo está em formato compatível (MP4, WebM, HLS/M3U8)
            </p>
            {serverList.length > 1 && (
              <Button variant="secondary" size="sm" className="mt-4 gap-2" onClick={() => setShowServers(true)}>
                <Server className="w-4 h-4" />
                Trocar provedor
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Play central quando pausado */}
      {!isPlaying && !videoError && !isLoading && (
        <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
          <button
            onClick={togglePlay}
            aria-label="Reproduzir"
            className="pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white/20"
          >
            <Play className="ml-1 h-9 w-9" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Skip Intro */}
      {showSkipIntro && isPlaying && (
        <div className="absolute bottom-40 right-4 sm:right-6 animate-fade-in z-10">
          <Button
            onClick={skipIntro}
            className="gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white shadow-xl rounded-full px-6 min-h-11"
            size="lg"
          >
            Pular Abertura
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Next */}
      {showNextButton && nextLabel && onNextClick && (
        <div className="absolute bottom-40 right-4 sm:right-6 animate-fade-in z-10">
          <Button onClick={onNextClick} className="gap-2 bg-primary hover:bg-primary/90 shadow-xl rounded-full px-6 min-h-11" size="lg">
            {nextLabel}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* ===== Topo: vinheta + relógio ===== */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-start justify-end bg-gradient-to-b from-black/80 via-black/30 to-transparent px-4 pb-16 pt-3 sm:px-6 sm:pt-4 transition-opacity duration-500',
          controlsVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <span className="text-sm font-medium tabular-nums text-white/80 drop-shadow">{clock}</span>
      </div>

      {/* ===== Base: título, pílula, scrubber, card ===== */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-3 pt-20 sm:px-6 sm:pb-5 transition-all duration-500',
          controlsVisible ? 'opacity-100 translate-y-0 [&>*]:pointer-events-auto' : 'opacity-0 translate-y-3 [&_*]:!pointer-events-none'
        )}
      >
        {/* Título + pílula */}
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15"
            >
              {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
            </button>
            {title && (
              <h3 className="truncate text-base font-semibold text-white drop-shadow-md sm:text-xl">{title}</h3>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md">
            {/* Legendas */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Legendas"
                  title="Legendas"
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/15 sm:h-9 sm:w-9',
                    activeSubtitle && 'bg-white/20'
                  )}
                >
                  <Subtitles className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[200px] rounded-xl border-white/10 bg-black/85 p-2 text-white backdrop-blur-xl"
              >
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">Legendas</div>
                <DropdownMenuItem
                  onClick={() => selectSubtitle(null)}
                  className={cn('rounded-lg text-white/90 focus:bg-white/15 focus:text-white', !activeSubtitle && 'bg-white/10')}
                >
                  <MessageSquareOff className="mr-2 h-4 w-4" />
                  Desativado
                  {!activeSubtitle && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                {subtitles.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
                {subtitles.map((sub) => (
                  <DropdownMenuItem
                    key={sub.id}
                    onClick={() => selectSubtitle(sub)}
                    className={cn('rounded-lg text-white/90 focus:bg-white/15 focus:text-white', activeSubtitle === sub.id && 'bg-white/10')}
                  >
                    {sub.language}
                    {activeSubtitle === sub.id && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
                {subtitles.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-white/50">Nenhuma legenda disponível</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Áudio / servidores */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Áudio e faixas"
                  title="Áudio e faixas"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/15 sm:h-9 sm:w-9"
                >
                  <AudioLines className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[220px] max-h-[60vh] overflow-y-auto rounded-xl border-white/10 bg-black/85 p-2 text-white backdrop-blur-xl"
              >
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">Áudio</div>
                {serverList.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-white/70">Faixa padrão</div>
                )}
                {visibleServers.map(({ sv, i }) => (
                  <DropdownMenuItem
                    key={sv.url || i}
                    onClick={() => selectServer(i)}
                    className={cn('rounded-lg text-white/90 focus:bg-white/15 focus:text-white', activeServer === i && 'bg-white/10')}
                  >
                    <span className="truncate">{serverLabel(sv, i)}</span>
                    {activeServer === i && <Check className="ml-auto h-4 w-4 shrink-0" />}
                  </DropdownMenuItem>
                ))}
                {serverList.length > SERVERS_COLLAPSED_COUNT && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setServersExpanded((v) => !v); }}
                    className="mt-1 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    {serversExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {serversExpanded ? 'Minimizar fontes' : `Mostrar todas (${serverList.length})`}
                  </button>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* ··· Configurações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Mais opções"
                  title="Mais opções"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/15 sm:h-9 sm:w-9"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[260px] max-w-[90vw] max-h-[70vh] overflow-y-auto rounded-xl border-white/10 bg-black/85 p-2 text-white backdrop-blur-xl"
              >
                {/* Volume */}
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">Volume</div>
                <div className="flex items-center gap-3 px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
                  >
                    <VolumeIcon className="h-4 w-4" />
                  </button>
                  <Slider
                    value={[isMuted ? 0 : Math.round(volume * 100)]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    disabled={!canSetVolume}
                    className="flex-1"
                    aria-label="Volume"
                  />
                  <span className="w-10 text-right text-xs tabular-nums text-white/70">
                    {isMuted ? 0 : Math.round(volume * 100)}%
                  </span>
                </div>

                {serverList.length > 1 && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">Servidores</div>
                    {visibleServers.map(({ sv, i }) => (
                      <DropdownMenuItem
                        key={sv.url || i}
                        onClick={() => selectServer(i)}
                        className={cn('rounded-lg text-white/90 focus:bg-white/15 focus:text-white', activeServer === i && 'bg-white/10')}
                      >
                        <Server className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{serverLabel(sv, i)}</span>
                        {activeServer === i && <Check className="ml-auto h-4 w-4 shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                {serverList.length > SERVERS_COLLAPSED_COUNT && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setServersExpanded((v) => !v); }}
                    className="mt-1 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    {serversExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {serversExpanded ? 'Minimizar fontes' : `Mostrar todas (${serverList.length})`}
                  </button>
                )}
                  </>
                )}

                <DropdownMenuSeparator className="bg-white/10" />
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">Velocidade</div>
                <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changePlaybackSpeed(speed)}
                      className={cn(
                        'min-h-9 rounded-lg text-sm tabular-nums transition hover:bg-white/15',
                        playbackSpeed === speed ? 'bg-white text-black hover:bg-white' : 'text-white/90'
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => void remoteFullscreen()} className="rounded-lg text-white/90 focus:bg-white/15 focus:text-white">
                  <RectangleHorizontal className="mr-2 h-4 w-4" />
                  Modo cinema
                  {isCinema && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={togglePiP} className="rounded-lg text-white/90 focus:bg-white/15 focus:text-white">
                  <PictureInPicture2 className="mr-2 h-4 w-4" />
                  Picture-in-Picture
                  {isPiP && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleStretch} className="rounded-lg text-white/90 focus:bg-white/15 focus:text-white">
                  <RectangleHorizontal className="mr-2 h-4 w-4" />
                  {isStretched ? 'Ajustar à tela' : 'Preencher tela'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleFullscreen} className="rounded-lg text-white/90 focus:bg-white/15 focus:text-white">
                  {isFullscreen ? <Minimize className="mr-2 h-4 w-4" /> : <Maximize className="mr-2 h-4 w-4" />}
                  {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/15 sm:h-9 sm:w-9"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Scrubber */}
        <div
          className="group/progress relative py-2"
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverPreview(null)}
        >
          <div className="relative h-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all group-hover/progress:h-2">
            <div className="absolute left-0 top-0 h-full rounded-full bg-white/30" style={{ width: `${buffered}%` }} />
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="absolute inset-0"
              aria-label="Progresso"
            />
          </div>

          {/* Tooltip de tempo + miniatura */}
          <div
            className={cn(
              'pointer-events-none absolute bottom-full z-10 mb-2 flex -translate-x-1/2 flex-col items-center transition-opacity duration-150',
              hoverPreview ? 'opacity-100' : 'invisible opacity-0'
            )}
            style={{
              left: hoverPreview
                ? Math.max(
                    previewReady ? 84 : 32,
                    Math.min(hoverPreview.x, hoverPreview.width - (previewReady ? 84 : 32))
                  )
                : 0,
            }}
          >
            <div
              className={cn(
                'overflow-hidden bg-black',
                previewReady ? 'mb-1.5 aspect-video w-40 rounded-lg border border-white/20 shadow-xl' : 'h-0 w-0'
              )}
            >
              <video
                ref={previewRef}
                muted
                playsInline
                preload="metadata"
                disablePictureInPicture
                controls={false}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="rounded-md bg-black/80 px-2 py-0.5 text-xs font-medium tabular-nums text-white shadow-lg">
              {formatTime(hoverPreview?.time ?? 0)}
            </span>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between font-mono text-xs tabular-nums text-white/70">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(remaining)}</span>
        </div>

        {/* Card inferior flutuante */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 shadow-2xl backdrop-blur-xl sm:gap-4 sm:p-4">
          {poster && (
            <img
              src={poster}
              alt=""
              className="h-16 w-11 shrink-0 rounded-lg object-cover shadow-lg sm:h-24 sm:w-16"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            {title && <p className="truncate text-sm font-semibold text-white sm:text-lg">{title}</p>}
            {overview && (
              <p className="hidden text-xs leading-relaxed text-white/70 line-clamp-2 sm:block sm:text-sm">{overview}</p>
            )}
            {metaItems.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/60 sm:text-xs">
                {metaItems.map((m, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-white/30">•</span>}
                    <span className="truncate">{m}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PlayerPortalContext.Provider>
  );
}
