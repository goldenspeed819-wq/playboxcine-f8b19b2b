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
  Expand,
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

export function VideoPlayer({ src, poster, title, nextLabel, onNextClick, introStartTime, introEndTime }: VideoPlayerProps) {
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
  const [isStretched, setIsStretched] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLeavePiP = () => setIsPiP(false);
    const handleEnterPiP = () => setIsPiP(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      setVideoError(null);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleError = () => {
      setVideoError("Erro ao carregar vídeo");
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = (value[0] / 100) * duration;
    setProgress(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0] / 100;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) containerRef.current.requestFullscreen?.(); else document.exitFullscreen?.();
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current.requestPictureInPicture();
    } catch (e) { console.error(e); }
  };

  const toggleStretch = () => setIsStretched(!isStretched);

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const skipIntro = () => {
    if (!videoRef.current || !introEndTime) return;
    videoRef.current.currentTime = introEndTime;
  };

  const changePlaybackSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="video-player-container group relative rounded-xl overflow-hidden bg-black w-full aspect-video"
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn(
          "w-full h-full transition-all duration-300",
          isStretched ? "object-fill" : "object-contain"
        )}
        onClick={togglePlay}
        playsInline
      />

      {/* Controls Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 flex flex-col justify-end p-4",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Progress */}
        <div className="mb-4">
          <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white" onClick={() => skip(-10)}><Rewind /></Button>
            <Button variant="ghost" size="icon" className="text-white" onClick={() => skip(10)}><FastForward /></Button>
            <Button variant="ghost" size="icon" className="text-white" onClick={toggleMute}><VolumeIcon /></Button>
            <span className="text-white text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white"><Settings /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black text-white border-white/20">
                {[0.5, 1, 1.5, 2].map(speed => (
                  <DropdownMenuItem key={speed} onClick={() => changePlaybackSpeed(speed)}>
                    {speed}x {playbackSpeed === speed && "✓"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className={cn("text-white", isPiP && "text-primary")} onClick={togglePiP}>
              <PictureInPicture2 />
            </Button>

            {/* BOTÃO ESTICAR CORRIGIDO */}
            <Button
              variant="ghost"
              size="icon"
              className={cn("text-white", isStretched && "text-primary")}
              onClick={toggleStretch}
            >
              <Expand />
            </Button>

            <Button variant="ghost" size="icon" className="text-white" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize /> : <Maximize /> }
            </Button>
          </div>
        </div>
      </div>

      {showSkipIntro && (
        <Button className="absolute bottom-20 right-4" onClick={skipIntro}>Pular Abertura</Button>
      )}
    </div>
  );
}
