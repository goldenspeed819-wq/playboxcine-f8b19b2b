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
  SkipBack,
  SkipForward,
  ChevronRight,
  PictureInPicture2,
  Rewind,
  FastForward,
  AlertCircle,
  RectangleHorizontal,
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
  subtitleUrl?: string | null;
  nextLabel?: string;
  onNextClick?: () => void;
  introStartTime?: number | null;
  introEndTime?: number | null;
}

export function VideoPlayer({
  src,
  poster,
  title,
  nextLabel,
  onNextClick,
  introStartTime,
  introEndTime,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ✅ ESTICAR TELA */
  const [isStretched, setIsStretched] = useState(false);
  const toggleStretch = () => {
    setIsStretched(prev => !prev);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.pause() : video.play();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    !isFullscreen ? container.requestFullscreen() : document.exitFullscreen();
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden"
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={cn(
          'w-full h-full bg-black',
          isStretched ? 'object-cover' : 'object-contain'
        )}
        onClick={togglePlay}
        playsInline
      />

      {/* CONTROLES */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 px-4 pb-4 pt-14">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <span className="text-sm text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* CONFIG */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Settings />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                  <DropdownMenuItem key={speed} onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.playbackRate = speed;
                      setPlaybackSpeed(speed);
                    }
                  }}>
                    {speed}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* PiP */}
            <Button size="icon" variant="ghost" onClick={togglePiP}>
              <PictureInPicture2 />
            </Button>

            {/* 🔥 ESTICAR TELA */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleStretch}
              title="Esticar tela"
              className={cn(isStretched && 'text-primary bg-primary/20')}
            >
              <RectangleHorizontal />
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
