import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture2,
  Rewind,
  FastForward,
  Crop,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string | null;
  poster?: string | null;
  title?: string;
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  /* 🔥 Tela esticada (preencher sem bordas) */
  const [isFillMode, setIsFillMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('video-fill-mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('video-fill-mode', String(isFillMode));
  }, [isFillMode]);

  /* 🔄 Atualização de tempo */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100 || 0);
    };

    const loaded = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', update);
    video.addEventListener('loadedmetadata', loaded);

    return () => {
      video.removeEventListener('timeupdate', update);
      video.removeEventListener('loadedmetadata', loaded);
    };
  }, [src]);

  /* 🖥 Fullscreen */
  useEffect(() => {
    const fs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);
    return () => document.removeEventListener('fullscreenchange', fs);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    !isFullscreen
      ? containerRef.current.requestFullscreen()
      : document.exitFullscreen();
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPiP(false);
    } else if (document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture();
      setIsPiP(true);
    }
  };

  const toggleFillMode = () => setIsFillMode(v => !v);

  /* ⏱ Tempo correto (horas após 59 min) */
  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return '0:00';

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!src) {
    return (
      <div className="flex items-center justify-center h-64 bg-black text-white/60 rounded-xl">
        Nenhum vídeo disponível
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-h-[70vh] bg-black overflow-hidden rounded-xl"
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={cn(
          'w-full h-full',
          isFillMode ? 'object-cover' : 'object-contain'
        )}
        onClick={togglePlay}
        playsInline
      />

      {/* LOADING */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* CONTROLES */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-12">
        {/* PROGRESSO */}
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={v => {
            if (!videoRef.current) return;
            videoRef.current.currentTime = (v[0] / 100) * duration;
          }}
        />

        <div className="flex items-center justify-between mt-3">
          {/* ESQUERDA */}
          <div className="flex items-center gap-3 text-white">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => (videoRef.current!.currentTime -= 10)}
            >
              <Rewind />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => (videoRef.current!.currentTime += 10)}
            >
              <FastForward />
            </Button>

            <span className="text-sm text-white/80 min-w-[110px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* VOLUME */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMuted(v => !v)}
            >
              <VolumeIcon />
            </Button>

            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={v => {
                  if (!videoRef.current) return;
                  const vol = v[0] / 100;
                  setVolume(vol);
                  videoRef.current.volume = vol;
                  setIsMuted(vol === 0);
                }}
              />
            </div>
          </div>

          {/* DIREITA */}
          <div className="flex items-center gap-1 text-white">
            {/* VELOCIDADE */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Settings />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => {
                      if (!videoRef.current) return;
                      videoRef.current.playbackRate = speed;
                      setPlaybackSpeed(speed);
                    }}
                    className={cn(
                      playbackSpeed === speed &&
                        'text-red-500 bg-red-500/15 font-semibold'
                    )}
                  >
                    {speed}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* PiP */}
            <Button size="icon" variant="ghost" onClick={togglePiP}>
              <PictureInPicture2 />
            </Button>

            {/* TELA ESTICADA */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFillMode}
              title="Tela Esticada"
              className={cn(isFillMode && 'text-primary bg-primary/20')}
            >
              <Crop />
            </Button>

            {/* FULLSCREEN */}
            <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
