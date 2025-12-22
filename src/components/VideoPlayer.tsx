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
  DropdownMenuSeparator,
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

  // Reset states when src changes
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
      setVideoError(null);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleLeavePiP = () => setIsPiP(false);
    const handleEnterPiP = () => setIsPiP(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      setVideoError(null);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleError = () => {
      const error = video.error;
      let errorMessage = 'Erro ao carregar o vídeo';
      if (error) {
        switch (error.code) {
          case 1:
            errorMessage = 'Carregamento do vídeo foi interrompido';
            break;
          case 2:
            errorMessage = 'Erro de rede ao carregar o vídeo';
            break;
          case 3:
            errorMessage = 'Formato de vídeo não suportado pelo navegador';
            break;
          case 4:
            errorMessage = 'Vídeo não encontrado ou inacessível';
            break;
        }
      }
      setVideoError(errorMessage);
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
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
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };
const toggleStretch = () => {
  setIsStretched(!isStretched);
};
  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const skipIntro = () => {
    const video = videoRef.current;
    if (!video || !introEndTime) return;
    video.currentTime = introEndTime;
  };

  const changePlaybackSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  if (!src) {
    return (
      <div className="video-player-container flex items-center justify-center bg-black/90 rounded-xl">
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
      className="video-player-container group relative rounded-xl overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
<video
  ref={videoRef}
  src={src}
  poster={poster || undefined}
  className={cn(  "w-full h-full bg-black transition-all duration-300",
    isStretched ? "object-fill" : "object-contain"
  )}
  onClick={togglePlay}
  playsInline
/>
      {/* Loading Indicator */}
      {isLoading && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-destructive font-medium mb-2">{videoError}</p>
            <p className="text-muted-foreground text-sm">Verifique se o vídeo está em formato compatível (MP4, WebM)</p>
          </div>
        </div>
      )}

      {/* Center Play Button Overlay */}
      {!isPlaying && !videoError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary hover:scale-110 flex items-center justify-center transition-all duration-300 shadow-2xl shadow-primary/30"
          >
            <Play className="w-9 h-9 text-primary-foreground ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Skip Intro Button */}
      {showSkipIntro && isPlaying && (
        <div className="absolute bottom-28 right-6 animate-fade-in z-10">
          <Button
            onClick={skipIntro}
            className="gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white shadow-xl rounded-full px-6"
            size="lg"
          >
            Pular Abertura
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Next Episode/Part Button */}
      {showNextButton && nextLabel && onNextClick && (
        <div className="absolute bottom-28 right-6 animate-fade-in z-10">
          <Button
            onClick={onNextClick}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-xl rounded-full px-6"
            size="lg"
          >
            {nextLabel}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Title - Top */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300">
          <h3 className="font-display font-bold text-lg text-white drop-shadow-lg">
            {title}
          </h3>
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-5 pb-4 pt-16 transition-all duration-300',
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
      >
        {/* Progress Bar */}
        <div className="relative mb-4 group/progress">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden relative cursor-pointer hover:h-2 transition-all">
            {/* Buffered */}
            <div
              className="h-full bg-white/30 absolute left-0 top-0 rounded-full"
              style={{ width: `${buffered}%` }}
            />
            {/* Progress */}
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
        <div className="flex items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </Button>

            {/* Skip Back */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105"
              onClick={() => skip(-10)}
              title="Voltar 10s"
            >
              <Rewind className="w-5 h-5" />
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105"
              onClick={() => skip(10)}
              title="Avançar 10s"
            >
              <FastForward className="w-5 h-5" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-1 group/volume ml-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all"
                onClick={toggleMute}
              >
                <VolumeIcon className="w-5 h-5" />
              </Button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-24"
                />
              </div>
            </div>

            {/* Time Display */}
            <span className="text-sm text-white/80 ml-3 tabular-nums font-medium">
              {formatTime(currentTime)} <span className="text-white/50">/</span> {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
<div className="flex items-center gap-1 shrink-0"> {/* Adicionei shrink-0 para não espremer os botões */}
  
  {/* Settings */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105"
        title="Configurações"
      >
        <Settings className="w-5 h-5" />
      </Button>
      </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 min-w-[160px] rounded-xl">
                <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Velocidade
                </div>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <DropdownMenuItem
  {/* Picture-in-Picture */}
  <Button
    variant="ghost"
    size="icon"
    className={cn(
      'text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105',
      isPiP && 'text-primary bg-primary/20'
    )}
    onClick={togglePiP}
    title="Picture-in-Picture"
  >
    <PictureInPicture2 className="w-5 h-5" />
  </Button>

  {/* BOTÃO ESTICAR - Verifique se o ícone Expand está importado no topo! */}
  <Button
    variant="ghost"
    size="icon"
    className={cn(
      "text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105",
      isStretched && "text-primary bg-primary/20"
    )}
    onClick={toggleStretch}
    title={isStretched ? "Restaurar proporção" : "Esticar vídeo"}
  >
    <Expand className="w-5 h-5" />
  </button>

  {/* Fullscreen */}
  <Button
    variant="ghost"
    size="icon"
    className="text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105"
    onClick={toggleFullscreen}
    title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
  >
    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
  </Button>
</div>
