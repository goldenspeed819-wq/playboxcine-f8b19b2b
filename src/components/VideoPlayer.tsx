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

  const [isFillMode, setIsFillMode] = useState(
    typeof window !== 'undefined' &&
      localStorage.getItem('video-fill-mode') === 'true'
  );

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  /* ---------------- EFFECTS ---------------- */

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

  useEffect(() => {
    const fs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);
    return () => document.removeEventListener('fullscreenchange', fs);
  }, []);

  /* ---------------- FUNÇÕES ---------------- */

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
    document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : videoRef.current.requestPictureInPicture();
    setIsPiP(!isPiP);
  };

  const toggleFillMode = () => setIsFillMode(prev => !prev);

  const getTimeFromEvent = (
    e: React.MouseEvent | React.TouchEvent,
    element: HTMLDivElement
  ) => {
    const rect = element.getBoundingClientRect();
    const clientX =
      'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    return { time: (x / rect.width) * duration, x };
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

  /* ---------------- RENDER ---------------- */

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden"
    >
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

      {/* TIMELINE */}
      <div className="absolute bottom-20 left-4 right-4">
        <div
          className="relative h-1.5 bg-white/30 rounded cursor-pointer"
          onMouseDown={e => {
            setIsScrubbing(true);
            const { time } = getTimeFromEvent(e, e.currentTarget);
            videoRef.current!.currentTime = time;
          }}
          onMouseMove={e => {
            const { time, x } = getTimeFromEvent(e, e.currentTarget);
            setHoverTime(time);
            setHoverX(x);
            if (isScrubbing) videoRef.current!.currentTime = time;
          }}
          onMouseUp={() => setIsScrubbing(false)}
          onMouseLeave={() => {
            setHoverTime(null);
            setIsScrubbing(false);
          }}
        >
          <div
            className="absolute h-full bg-red-500 rounded"
            style={{ width: `${progress}%` }}
          />

          {/* PREVIEW PEQUENO */}
          {hoverTime !== null && (
            <>
              <div
                className="absolute -top-7 px-2 py-0.5 text-xs bg-black text-white rounded"
                style={{ left: hoverX, transform: 'translateX(-50%)' }}
              >
                {formatTime(hoverTime)}
              </div>
              <div
                className="absolute top-[-4px] bottom-[-4px] w-[1.5px] bg-white"
                style={{ left: hoverX }}
              />
            </>
          )}
        </div>
      </div>

      {/* CONTROLES */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/90">
        <div className="flex items-center gap-2 text-white">
          <Button size="icon" variant="ghost" onClick={togglePlay}>
            {isPlaying ? <Pause /> : <Play />}
          </Button>

          <Button size="icon" variant="ghost" onClick={() => (videoRef.current!.currentTime -= 10)}>
            <Rewind />
          </Button>

          <Button size="icon" variant="ghost" onClick={() => (videoRef.current!.currentTime += 10)}>
            <FastForward />
          </Button>

          <Button size="icon" variant="ghost" onClick={() => setIsMuted(!isMuted)}>
            <VolumeIcon />
          </Button>

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
            className="w-20"
          />

          <span className="text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-white">
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
                  className={cn(
                    playbackSpeed === speed && 'text-red-500 font-bold'
                  )}
                  onClick={() => {
                    videoRef.current!.playbackRate = speed;
                    setPlaybackSpeed(speed);
                  }}
                >
                  {speed}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="icon" variant="ghost" onClick={togglePiP}>
            <PictureInPicture2 />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFillMode}
            className={cn(isFillMode && 'text-red-500')}
          >
            <Crop />
          </Button>

          <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>
    </div>
  );
}
