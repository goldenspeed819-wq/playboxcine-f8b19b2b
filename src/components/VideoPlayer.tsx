import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
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
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isFillMode, setIsFillMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [showPreview, setShowPreview] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const loaded = () => setDuration(video.duration);

    video.addEventListener('timeupdate', update);
    video.addEventListener('loadedmetadata', loaded);

    return () => {
      video.removeEventListener('timeupdate', update);
      video.removeEventListener('loadedmetadata', loaded);
    };
  }, []);

  useEffect(() => {
    const fs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);
    return () => document.removeEventListener('fullscreenchange', fs);
  }, []);

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s
          .toString()
          .padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const seekWithPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(
      Math.max((e.clientX - rect.left) / rect.width, 0),
      1
    );

    const time = percent * duration;

    videoRef.current.currentTime = time;
    setProgress(percent * 100);
    setHoverTime(time);
    setHoverX(e.clientX - rect.left);

    if (previewRef.current) {
      previewRef.current.currentTime = time;
    }
  };

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden rounded-xl"
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
        onClick={() => {
          if (!videoRef.current) return;
          isPlaying
            ? videoRef.current.pause()
            : videoRef.current.play();
          setIsPlaying(!isPlaying);
        }}
        playsInline
      />

      {/* CONTROLES */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-10">
        {/* TIMELINE */}
        <div
          className="relative"
          onPointerDown={e => {
            setIsDragging(true);
            setShowPreview(true);
            seekWithPointer(e);
          }}
          onPointerMove={e => {
            if (!isDragging) return;
            seekWithPointer(e);
          }}
          onPointerUp={() => {
            setIsDragging(false);
            setShowPreview(false);
          }}
          onPointerLeave={() => {
            setIsDragging(false);
            setShowPreview(false);
          }}
        >
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={() => {}}
            className="
              [&_.range]:bg-red-500
              [&_.track]:bg-neutral-700
              [&_[role=slider]]:border-black
            "
          />

          {/* PREVIEW — TAMANHO CONTROLADO */}
          {showPreview && (
            <div
              className="absolute -top-20 pointer-events-none"
              style={{ left: hoverX - 56 }}
            >
              <video
                ref={previewRef}
                src={src}
                muted
                preload="metadata"
                className="w-[112px] h-[64px] object-cover rounded-md border border-white/20"
              />
              <div className="text-[11px] text-white text-center mt-1">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}
        </div>

        {/* CONTROLES */}
        <div className="flex items-center justify-between mt-3 text-white">
          {/* ESQUERDA */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost">
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

            {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}

            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={v => {
                const vol = v[0] / 100;
                setVolume(vol);
                videoRef.current!.volume = vol;
                setIsMuted(vol === 0);
              }}
              className="
                w-24
                [&_.range]:bg-red-500
                [&_.track]:bg-neutral-700
                [&_[role=slider]]:border-black
              "
            />

            <span className="text-sm text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* DIREITA */}
          <div className="flex items-center gap-1">
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
                      videoRef.current!.playbackRate = speed;
                      setPlaybackSpeed(speed);
                    }}
                    className={cn(
                      playbackSpeed === speed &&
                        'text-red-500 font-semibold'
                    )}
                  >
                    {speed}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="icon" variant="ghost">
              <PictureInPicture2 />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsFillMode(p => !p)}
              className={cn(isFillMode && 'text-red-500')}
            >
              <Crop />
            </Button>

            <Button size="icon" variant="ghost">
              {isFullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
