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

  const [isFillMode, setIsFillMode] = useState(
    () => localStorage.getItem('video-fill-mode') === 'true'
  );

  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);

  useEffect(() => {
    localStorage.setItem('video-fill-mode', String(isFillMode));
  }, [isFillMode]);

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

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden rounded-xl"
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

      {/* CONTROLES */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">

        {/* PREVIEW */}
        <div
          className="absolute bottom-16 pointer-events-none"
          style={{ left: hoverX - 80 }}
        >
          <video
            ref={previewRef}
            src={src}
            muted
            className="w-40 h-24 object-cover rounded-md border border-white/20"
          />
          <div className="text-center text-xs text-white mt-1">
            {formatTime(hoverTime)}
          </div>
        </div>

        {/* TIMELINE */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = ((e.clientX - rect.left) / rect.width) * 100;
            const time = (percent / 100) * duration;
            setHoverTime(time);
            setHoverX(e.clientX - rect.left);
            previewRef.current &&
              (previewRef.current.currentTime = time);
          }}
          onChange={e => {
            const v = Number(e.target.value);
            videoRef.current!.currentTime = (v / 100) * duration;
            setProgress(v);
          }}
          className="range-red w-full"
          style={{ '--value': `${progress}%` } as React.CSSProperties}
        />

        {/* CONTROLES */}
        <div className="flex items-center justify-between mt-3 text-white">

          {/* ESQUERDA */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>

            <Button size="icon" variant="ghost" onClick={() => (videoRef.current!.currentTime -= 10)}>
              <Rewind />
            </Button>

            <Button size="icon" variant="ghost" onClick={() => (videoRef.current!.currentTime += 10)}>
              <FastForward />
            </Button>

            <Button size="icon" variant="ghost" onClick={() => {
              setIsMuted(!isMuted);
              videoRef.current!.muted = !isMuted;
            }}>
              <VolumeIcon />
            </Button>

            {/* VOLUME */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={e => {
                const v = Number(e.target.value);
                setVolume(v);
                videoRef.current!.volume = v;
                setIsMuted(v === 0);
              }}
              className="range-red w-24"
              style={{ '--value': `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties}
            />

            <span className="text-sm">
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
                {[0.5, 1, 1.25, 1.5, 2].map(s => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => (videoRef.current!.playbackRate = s)}
                    className={cn(
                      videoRef.current?.playbackRate === s &&
                        'text-red-500 font-bold'
                    )}
                  >
                    {s}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* BIG PICTURE */}
            <Button size="icon" variant="ghost" onClick={togglePiP}>
              <PictureInPicture2 />
            </Button>

            {/* TELA ESTICADA */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsFillMode(v => !v)}
              className={cn(isFillMode && 'text-red-500')}
              title="Tela esticada"
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
