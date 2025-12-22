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
  const [showNextButton, setShowNextButton] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** ✅ TELA ESTICADA */
  const [isFillMode, setIsFillMode] = useState(false);

  const isMobile =
    typeof window !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setVideoError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const hasIntro = introStartTime != null && introEndTime != null;
    if (hasIntro && currentTime >= introStartTime && currentTime < introEndTime) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
  }, [currentTime, introStartTime, introEndTime]);

  useEffect(() => {
    if (onNextClick && duration > 0) {
      const timeRemaining = duration - currentTime;
      const percentComplete = (currentTime / duration) * 100;
      setShowNextButton(percentComplete >= 90 || timeRemaining <= 30);
    } else {
      setShowNextButton(false);
    }
  }, [currentTime, duration, onNextClick]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.pause() : video.play();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    !isFullscreen
      ? container.requestFullscreen?.()
      : document.exitFullscreen?.();
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

  /** ✅ FUNÇÃO TELA ESTICADA */
  const toggleFillMode = () => {
    setIsFillMode((prev) => !prev);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  if (!src) {
    return (
      <div className="flex items-center justify-center bg-black/90 rounded-xl">
        <p className="text-muted-foreground">Nenhum vídeo disponível</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative rounded-xl overflow-hidden bg-black"
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        onClick={togglePlay}
        playsInline
        className={cn(
          'w-full h-full bg-black transition-all duration-300',
          isFillMode ? 'object-cover' : 'object-contain'
        )}
      />

      {/* CONTROLES */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-16 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-between">
          {/* ESQUERDA */}
          <Button variant="ghost" size="icon" onClick={togglePlay}>
            {isPlaying ? <Pause /> : <Play />}
          </Button>

          {/* DIREITA */}
          <div className="flex items-end gap-2">
            {/* TELA ESTICADA */}
            {!(isMobile && isFullscreen) && (
              <div className="flex flex-col items-center leading-none">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFillMode}
                  className={cn(
                    'text-white hover:bg-white/15',
                    isFillMode && 'text-primary bg-primary/20'
                  )}
                >
                  <Crop className="w-5 h-5" />
                </Button>
                <span className="text-[10px] text-white/70">
                  Tela Esticada
                </span>
              </div>
            )}

            {/* PiP */}
            <Button variant="ghost" size="icon" onClick={togglePiP}>
              <PictureInPicture2 />
            </Button>

            {/* FULLSCREEN */}
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
