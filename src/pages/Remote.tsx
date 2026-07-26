import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  PictureInPicture2,
  Home,
  Film,
  Popcorn,
  Tv,
  Search,
  Loader2,
  Wifi,
  WifiOff,
  ChevronRight,
  Gauge,
  Upload,
  RotateCcw,
  MousePointer2,
  Crosshair,
  MonitorPlay,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  CornerDownLeft,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  remoteChannelName,
  type RemoteCommand,
  type RemotePlayerState,
} from '@/contexts/RemoteControlContext';

const LAST_CODE_KEY = 'rynex-remote-last-code';
const SITE_VOLUME_KEY = 'rynex-site-volume';
const SITE_MUTED_KEY = 'rynex-site-muted';

interface HostState {
  page: string;
  hasPlayer: boolean;
  player: RemotePlayerState | null;
  extension?: {
    detected: boolean;
    version?: string;
    lastAck?: string;
    lastError?: string;
  };
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail: string | null;
  release_year: number | null;
  kind: 'movie' | 'series';
}

const formatTime = (time: number) => {
  if (!isFinite(time) || isNaN(time)) return '0:00';
  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = Math.floor(time % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
};

export default function Remote() {
  const [searchParams] = useSearchParams();
  const [codeInput, setCodeInput] = useState(
    () => (searchParams.get('code') || localStorage.getItem(LAST_CODE_KEY) || '').toUpperCase(),
  );
  const [pairedCode, setPairedCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [hostState, setHostState] = useState<HostState | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastHostMessage = useRef<number>(0);

  // ---- Pairing -----------------------------------------------------------
  useEffect(() => {
    if (!pairedCode) return;

    const channel = supabase.channel(remoteChannelName(pairedCode), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        lastHostMessage.current = Date.now();
        setHostState(payload as HostState);
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'cmd', payload: { action: 'hello' } });
        }
      });

    return () => {
      channelRef.current = null;
      setConnected(false);
      supabase.removeChannel(channel);
    };
  }, [pairedCode]);

  const [vibrateOn, setVibrateOn] = useState(
    () => localStorage.getItem('rynex-remote-vibrate') === 'true',
  );
  const lastVibrate = useRef(0);

  const send = useCallback(
    (command: RemoteCommand) => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.send({ type: 'broadcast', event: 'cmd', payload: command });
      const now = Date.now();
      if (
        vibrateOn &&
        navigator.vibrate &&
        !command.action.startsWith('pointerMove') &&
        !command.action.startsWith('pointerScroll') &&
        now - lastVibrate.current > 400
      ) {
        lastVibrate.current = now;
        navigator.vibrate(8);
      }
    },
    [vibrateOn],
  );

  // Pointer moves/scrolls are batched: Realtime broadcast is rate limited, so
  // sending one message per touchmove would be dropped and the cursor freezes.
  const pending = useRef({ moveX: 0, moveY: 0, scroll: 0 });
  const flushTimer = useRef<number | null>(null);

  const sendPointer = useCallback(
    (command: RemoteCommand) => {
      if (command.action === 'pointerMove') {
        pending.current.moveX += command.dx ?? 0;
        pending.current.moveY += command.dy ?? 0;
      } else if (command.action === 'pointerScroll') {
        pending.current.scroll += command.dy ?? 0;
      } else {
        send(command);
        return;
      }

      if (flushTimer.current) return;
      flushTimer.current = window.setTimeout(() => {
        flushTimer.current = null;
        const { moveX, moveY, scroll } = pending.current;
        pending.current = { moveX: 0, moveY: 0, scroll: 0 };
        if (moveX || moveY) send({ action: 'pointerMove', dx: moveX, dy: moveY });
        if (scroll) send({ action: 'pointerScroll', dy: scroll });
      }, 70);
    },
    [send],
  );

  const handlePair = () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 6) {
      toast({ title: 'Código inválido', description: 'O código tem 6 caracteres.', variant: 'destructive' });
      return;
    }
    localStorage.setItem(LAST_CODE_KEY, code);
    setPairedCode(code);
  };

  const player = hostState?.player ?? null;
  const hostOnline = connected && Date.now() - lastHostMessage.current < 8000;

  // keeps the "online" badge fresh
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((t) => t + 1), 2000);
    return () => window.clearInterval(id);
  }, []);

  if (!pairedCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="font-display text-4xl tracking-wider gradient-text">CONTROLE RYNEX</h1>
            <p className="text-sm text-muted-foreground">
              No PC, abra o menu do controle remoto e digite aqui o código de 6 caracteres.
            </p>
          </div>
          <Input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            className="text-center text-3xl font-display tracking-[0.4em] h-16"
            autoCapitalize="characters"
          />
          <Button className="w-full h-12 text-base" onClick={handlePair}>
            Conectar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Status bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {hostOnline ? (
            <Wifi className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">
              {hostOnline ? player?.title || 'PC conectado' : 'Procurando o PC...'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {pairedCode} · {hostState?.page || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn('text-xs', vibrateOn ? 'text-primary' : 'text-muted-foreground')}
            onClick={() => {
              const next = !vibrateOn;
              setVibrateOn(next);
              localStorage.setItem('rynex-remote-vibrate', String(next));
            }}
          >
            {vibrateOn ? 'Vibrar: on' : 'Vibrar: off'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPairedCode(null);
              setHostState(null);
            }}
          >
            Trocar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="control" className="px-4 pt-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="control">Controle</TabsTrigger>
          <TabsTrigger value="mouse">Mouse</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="pt-5">
          <ControlPad player={player} send={send} />
        </TabsContent>

        <TabsContent value="mouse" className="pt-5">
          <TouchpadPad send={sendPointer} />
        </TabsContent>

        <TabsContent value="content" className="pt-5">
          <ContentPicker send={send} />
        </TabsContent>

        <TabsContent value="import" className="pt-5">
          <QuickImportRemote send={send} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ControlPad({
  player,
  send,
}: {
  player: RemotePlayerState | null;
  send: (command: RemoteCommand) => void;
}) {
  const VolumeIcon = !player ? Volume2 : player.isMuted || player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="premium-card p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(player?.currentTime ?? 0)}</span>
          <span>{formatTime(player?.duration ?? 0)}</span>
        </div>
        <Slider
          value={[player && player.duration ? (player.currentTime / player.duration) * 100 : 0]}
          max={100}
          step={0.5}
          disabled={!player?.duration}
          onValueChange={(value) =>
            player?.duration && send({ action: 'seekTo', value: (value[0] / 100) * player.duration })
          }
        />
        {!player && (
          <p className="text-xs text-muted-foreground text-center">
            Nenhum vídeo tocando no PC. Escolha algo na aba Conteúdo.
          </p>
        )}
      </div>

      {/* Transport */}
      <div className="grid grid-cols-3 gap-3">
        <RemoteButton icon={Rewind} label="-10s" onClick={() => send({ action: 'seek', value: -10 })} />
        <RemoteButton
          icon={player?.isPlaying ? Pause : Play}
          label={player?.isPlaying ? 'Pausar' : 'Play'}
          primary
          onClick={() => send({ action: 'togglePlay' })}
        />
        <RemoteButton icon={FastForward} label="+10s" onClick={() => send({ action: 'seek', value: 10 })} />
        <RemoteButton icon={Rewind} label="-60s" onClick={() => send({ action: 'seek', value: -60 })} />
        <RemoteButton icon={ChevronRight} label="Pular abertura" onClick={() => send({ action: 'skipIntro' })} />
        <RemoteButton icon={FastForward} label="+60s" onClick={() => send({ action: 'seek', value: 60 })} />
      </div>

      {/* Volume */}
      <div className="premium-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => send({ action: 'toggleMute' })} className="text-muted-foreground hover:text-primary">
            <VolumeIcon className="w-5 h-5" />
          </button>
          <Slider
            value={[Math.round((player?.isMuted ? 0 : player?.volume ?? 1) * 100)]}
            max={100}
            step={1}
            onValueChange={(value) => send({ action: 'volume', value: value[0] / 100 })}
          />
          <span className="text-xs text-muted-foreground w-9 text-right">
            {Math.round((player?.isMuted ? 0 : player?.volume ?? 1) * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => send({ action: 'volumeDelta', value: -0.1 })}>
            Volume −
          </Button>
          <Button variant="secondary" onClick={() => send({ action: 'volumeDelta', value: 0.1 })}>
            Volume +
          </Button>
        </div>
      </div>

      {/* Screen + next */}
      <div className="grid grid-cols-3 gap-3">
        <RemoteButton icon={Maximize} label="Tela cheia" onClick={() => send({ action: 'toggleFullscreen' })} />
        <RemoteButton icon={SkipForward} label="Próximo ep." onClick={() => send({ action: 'next' })} />
        <RemoteButton icon={PictureInPicture2} label="Mini player" onClick={() => send({ action: 'togglePiP' })} />
      </div>

      {/* Speed */}
      <div className="premium-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Gauge className="w-4 h-4 text-primary" />
          Velocidade {player ? `(${player.speed}x)` : ''}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
            <Button
              key={speed}
              size="sm"
              variant={player?.speed === speed ? 'default' : 'secondary'}
              onClick={() => send({ action: 'speed', value: speed })}
            >
              {speed}x
            </Button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-4 gap-3">
        <RemoteButton icon={Home} label="Início" onClick={() => send({ action: 'goto', path: '/browse' })} />
        <RemoteButton icon={Film} label="Filmes" onClick={() => send({ action: 'goto', path: '/movies' })} />
        <RemoteButton icon={Popcorn} label="Séries" onClick={() => send({ action: 'goto', path: '/series' })} />
        <RemoteButton icon={Tv} label="Ao vivo" onClick={() => send({ action: 'goto', path: '/live' })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => send({ action: 'back' })}>
          Voltar
        </Button>
        <Button variant="secondary" onClick={() => send({ action: 'reload' })}>
          <RotateCcw className="w-4 h-4 mr-2" /> Recarregar
        </Button>
      </div>
    </div>
  );
}

function RemoteButton({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 py-4 px-2 transition-all active:scale-95',
        primary
          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25'
          : 'bg-card hover:border-primary/50',
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[11px] font-medium leading-tight text-center">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------

function ContentPicker({ send }: { send: (command: RemoteCommand) => void }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [movies, series] = await Promise.all([
        supabase.from('movies').select('id, title, thumbnail, release_year').order('title').limit(300),
        supabase.from('series').select('id, title, thumbnail, release_year').order('title').limit(300),
      ]);
      if (!active) return;
      const merged: ContentItem[] = [
        ...(series.data ?? []).map((s: any) => ({ ...s, kind: 'series' as const })),
        ...(movies.data ?? []).map((m: any) => ({ ...m, kind: 'movie' as const })),
      ];
      setItems(merged);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((item) => item.title.toLowerCase().includes(q)) : items;
    return list.slice(0, 60);
  }, [items, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filme ou série..."
          className="pl-9 h-11"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={`${item.kind}-${item.id}`}
              onClick={() =>
                send({
                  action: 'goto',
                  path: item.kind === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`,
                })
              }
              className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 text-left active:scale-[0.98] transition-transform"
            >
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} loading="lazy" className="w-10 h-14 rounded-md object-cover" />
              ) : (
                <div className="w-10 h-14 rounded-md bg-muted flex items-center justify-center">
                  <Film className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.kind === 'movie' ? 'Filme' : 'Série'}
                  {item.release_year ? ` · ${item.release_year}` : ''}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nada encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function QuickImportRemote({ send }: { send: (command: RemoteCommand) => void }) {
  const [type, setType] = useState<'series' | 'movie'>('series');
  const [title, setTitle] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [domain, setDomain] = useState('redecanais.cafe');
  const [server, setServer] = useState('21');
  const [numbering, setNumbering] = useState<'reset' | 'continuous'>('reset');

  const submit = () => {
    if (!title.trim()) {
      toast({ title: 'Informe o título', variant: 'destructive' });
      return;
    }
    send({
      action: 'quickImport',
      payload: { type, title: title.trim(), abbreviation: abbreviation.trim(), domain, server, numbering },
    });
    toast({ title: 'Enviado pro PC', description: 'A Importação Rápida abriu já preenchida.' });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Preenche e abre a Importação Rápida no PC, já buscando o TMDB automaticamente.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button variant={type === 'series' ? 'default' : 'secondary'} onClick={() => setType('series')}>
          <Popcorn className="w-4 h-4 mr-2" /> Série
        </Button>
        <Button variant={type === 'movie' ? 'default' : 'secondary'} onClick={() => setType('movie')}>
          <Film className="w-4 h-4 mr-2" /> Filme
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Cobra Kai" />
      </div>

      <div className="space-y-2">
        <Label>Abreviação</Label>
        <Input
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value)}
          placeholder="Ex: CBRKI"
          className="font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Domínio</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} className="font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label>RCServer</Label>
          <Input value={server} onChange={(e) => setServer(e.target.value)} className="font-mono text-xs" />
        </div>
      </div>

      {type === 'series' && (
        <div className="space-y-2">
          <Label>Numeração dos episódios</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={numbering === 'reset' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setNumbering('reset')}
            >
              Zera por temporada
            </Button>
            <Button
              variant={numbering === 'continuous' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setNumbering('continuous')}
            >
              Continua a contagem
            </Button>
          </div>
        </div>
      )}

      <Button className="w-full h-12" onClick={submit}>
        <Upload className="w-4 h-4 mr-2" /> Enviar pro PC
      </Button>
    </div>
  );
}
// ---------------------------------------------------------------------------

/** Touchpad mode: turns the phone into a virtual mouse for the PC screen. */
function TouchpadPad({
  send,
}: {
  send: (command: RemoteCommand) => void;
}) {
  const last = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const startedAt = useRef(0);
  const lastTap = useRef(0);
  const [speed, setSpeed] = useState(1.6);
  const [scrollMode, setScrollMode] = useState(false);
  const [feedback, setFeedback] = useState('pronto');
  const [siteVolume, setSiteVolume] = useState(() => Number(localStorage.getItem(SITE_VOLUME_KEY) ?? '1'));
  const [siteMuted, setSiteMuted] = useState(() => localStorage.getItem(SITE_MUTED_KEY) === 'true');

  const multiTouch = useRef(false);

  const sendSiteVolume = (next: number) => {
    const volume = Math.min(1, Math.max(0, next));
    setSiteVolume(volume);
    setSiteMuted(false);
    localStorage.setItem(SITE_VOLUME_KEY, String(volume));
    localStorage.setItem(SITE_MUTED_KEY, 'false');
    send({ action: 'siteVolume', value: volume });
  };

  const toggleSiteMute = () => {
    const next = !siteMuted;
    setSiteMuted(next);
    localStorage.setItem(SITE_MUTED_KEY, String(next));
    send({ action: 'siteToggleMute' });
  };

  const SiteVolumeIcon = siteMuted || siteVolume === 0 ? VolumeX : siteVolume < 0.5 ? Volume1 : Volume2;

  const onStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    multiTouch.current = false;
    last.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    startedAt.current = Date.now();
    setFeedback('tocando...');
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!last.current) return;
    e.preventDefault();
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    moved.current = true;

    if (scrollMode || multiTouch.current) {
      send({ action: 'pointerScroll', dy: -dy * 3 });
      setFeedback('rolando...');
    } else {
      send({ action: 'pointerMove', dx: dx * speed, dy: dy * speed });
      setFeedback(`movendo ${dx > 0 ? '→' : dx < 0 ? '←' : ''}${dy > 0 ? '↓' : dy < 0 ? '↑' : ''}`);
    }
  };

  const onEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
    const duration = Date.now() - startedAt.current;
    last.current = null;
    if (moved.current || duration > 400) {
      setFeedback('pronto');
      return;
    }

    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      send({ action: 'pointerDoubleTap' });
      setFeedback('duplo clique enviado');
    } else {
      lastTap.current = now;
      send({ action: 'pointerTap' });
      setFeedback('clique enviado');
    }
  };

  return (
    <div className="space-y-4">
      <div
        onPointerDown={onStart}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={() => {
          last.current = null;
          setFeedback('pronto');
        }}
        onTouchStart={(e) => {
          multiTouch.current = e.touches.length > 1;
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          'relative h-72 rounded-2xl border border-border/60 touch-none select-none overflow-hidden',
          scrollMode ? 'bg-primary/10' : 'bg-secondary/40',
        )}
      >
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded-full bg-background/70 text-primary">
          {feedback}
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground pointer-events-none">
          <MousePointer2 className="w-8 h-8 text-primary/70" />
          <p className="text-xs font-medium">
            {scrollMode ? 'Modo rolagem — arraste para rolar' : 'Arraste para mover o cursor'}
          </p>
          <p className="text-[10px]">1 toque = clique · 2 toques = duplo clique</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="secondary" className="gap-2" onClick={() => send({ action: 'pointerTap' })}>
          <MousePointer2 className="w-4 h-4" />
          Clique
        </Button>
        <Button
          variant={scrollMode ? 'default' : 'secondary'}
          className="gap-2"
          onClick={() => setScrollMode((v) => !v)}
        >
          <ArrowDown className="w-4 h-4" />
          Rolagem
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => send({ action: 'pointerCenter' })}>
          <Crosshair className="w-4 h-4" />
          Centralizar
        </Button>
      </div>

      {/* Directional nudges (precision) */}
      <div className="premium-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Ajuste fino do cursor</p>
        <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
          <span />
          <Button variant="outline" size="icon" onClick={() => send({ action: 'pointerMove', dy: -20 })}>
            <ArrowUp className="w-4 h-4" />
          </Button>
          <span />
          <Button variant="outline" size="icon" onClick={() => send({ action: 'pointerMove', dx: -20 })}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => send({ action: 'pointerTap' })}>
            <CornerDownLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => send({ action: 'pointerMove', dx: 20 })}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <span />
          <Button variant="outline" size="icon" onClick={() => send({ action: 'pointerMove', dy: 20 })}>
            <ArrowDown className="w-4 h-4" />
          </Button>
          <span />
        </div>
      </div>

      {/* Sensitivity */}
      <div className="premium-card p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Sensibilidade</span>
          <span className="text-xs text-muted-foreground">{speed.toFixed(1)}x</span>
        </div>
        <Slider value={[speed]} min={0.6} max={3.5} step={0.1} onValueChange={(v) => setSpeed(v[0])} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="gap-2 col-span-2" onClick={() => send({ action: 'embedPlay' })}>
          <MonitorPlay className="w-4 h-4" />
          Dar play no vídeo
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => send({ action: 'cinema' })}>
          <MonitorPlay className="w-4 h-4" />
          Tela cheia (embed)
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => send({ action: 'reload' })}>
          <RotateCcw className="w-4 h-4" />
          Recarregar
        </Button>
      </div>

      <div className="premium-card p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Volume do site inteiro</span>
          <span className="text-xs text-muted-foreground">{siteMuted ? 'Mudo' : `${Math.round(siteVolume * 100)}%`}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={toggleSiteMute}>
            <SiteVolumeIcon className="w-4 h-4" />
          </Button>
          <Slider
            value={[siteMuted ? 0 : Math.round(siteVolume * 100)]}
            max={100}
            step={1}
            onValueChange={(value) => sendSiteVolume(value[0] / 100)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => sendSiteVolume(siteVolume - 0.1)}>
            Volume −
          </Button>
          <Button variant="secondary" onClick={() => sendSiteVolume(siteVolume + 0.1)}>
            Volume +
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
        Para clicar e ajustar volume dentro do player externo, instale/atualize a extensão Rynex no PC.
      </p>
    </div>
  );
}
