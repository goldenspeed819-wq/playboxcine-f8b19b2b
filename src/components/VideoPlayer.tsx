import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  SkipBack,
  SkipForward,
  ChevronRight,
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
}

export function VideoPlayer({ src, poster, title, subtitleUrl, nextLabel, onNextClick }: VideoPlayerProps) {
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
  const [showControls, setShowControls] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Show next button when video is 90% complete or has less than 30 seconds remaining
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
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('progress', handleProgress);
    };
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (value[0] / 100) * duration;
    video.currentTime = newTime;
    setProgress(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0] / 100;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!src) {
    return (
      <div className="video-player-container flex items-center justify-center bg-surface-dark">
        <div className="text-center">
          <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum vídeo disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="video-player-container group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className="w-full h-full object-contain bg-black"
        onClick={togglePlay}
        crossOrigin="anonymous"
      >
        {subtitleUrl && subtitlesEnabled && (
          <track kind="subtitles" src={subtitleUrl} srcLang="pt" label="Português" default />
        )}
      </video>

      {/* Play Button Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors shadow-neon"
          >
            <Play className="w-10 h-10 text-primary-foreground ml-1" />
          </button>
        </div>
      )}

      {/* Next Episode/Part Button */}
      {showNextButton && nextLabel && onNextClick && (
        <div className="absolute bottom-24 right-4 animate-fade-in">
          <Button
            onClick={onNextClick}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg"
            size="lg"
          >
            {nextLabel}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Progress Bar */}
        <div className="relative mb-4 group/progress">
          <div className="h-1 bg-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/30 absolute"
              style={{ width: `${buffered}%` }}
            />
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="absolute inset-0"
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-foreground/10"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            {/* Skip Buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-foreground/10"
              onClick={() => skip(-10)}
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-foreground/10"
              onClick={() => skip(10)}
            >
              <SkipForward className="w-5 h-5" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-foreground/10"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <div className="w-20 hidden sm:block">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-xs text-foreground/80 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtitles */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-foreground hover:bg-foreground/10',
                subtitlesEnabled && 'text-primary'
              )}
              onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
            >
              <Subtitles className="w-5 h-5" />
            </Button>

            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground hover:bg-foreground/10"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem>Velocidade: 1x</DropdownMenuItem>
                <DropdownMenuItem>Qualidade: Auto</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-foreground/10"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Title */}
        {title && (
          <div className="absolute top-4 left-4 right-4">
            <h3 className="font-display font-bold text-lg text-foreground drop-shadow-lg">
              {title}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
