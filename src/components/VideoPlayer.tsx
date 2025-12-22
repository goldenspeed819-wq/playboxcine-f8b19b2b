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
  ChevronRight,
  PictureInPicture2,
  Rewind,
  FastForward,
  AlertCircle,
  Expand, // Novo ícone importado
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
  const [isStretched, setIsStretched] = useState(false); // 1. NOVO ESTADO
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Efeitos e funções existentes (mantidos)...
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
          case 1: errorMessage = 'Carregamento do vídeo foi interrompido'; break;
          case 2: errorMessage = 'Erro de rede ao carregar o vídeo'; break;
          case 3: errorMessage = 'Formato de vídeo não suportado pelo navegador'; break;
          case 4: errorMessage = 'Vídeo não encontrado ou inacessível'; break;
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
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.pause() : video.play();
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
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) { console.error(e); }
  };

  // 2. FUNÇÃO PARA ALTERNAR O MODO ESTICADO
  const toggleStretch = () => {
    setIsStretched(!isStretched);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const skipIntro = () => {
    if (videoRef.current && introEndTime) videoRef.current.currentTime = introEndTime;
  };

  const changePlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return hours > 0 
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    return volume < 0.5 ? Volume1 : Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  if (!src) {
    return (
      <div className="video-player-container flex items-center justify-center bg-black/90 rounded-xl aspect-video">
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
      className="video-player-container group relative rounded-xl overflow-hidden bg-black w-full aspect-video"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        // 3. APLICAÇÃO DA CLASSE DE ESTICAR
        className={cn(
          "w-full h-full bg-black transition-all duration-300",
          isStretched ? "object-fill" : "object-contain"
        )}
        onClick={togglePlay}
        playsInline
      />

      {/* Overlays (Loading, Error, Center Play, etc.) mantidos conforme seu código... */}
      {isLoading && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
            <div className="h-full bg-white/30 absolute left-0 top-0 rounded-full" style={{ width: `${buffered}%` }} />
            <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="absolute inset-0" />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-10 w-10 rounded-full" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-10 w-10 rounded-full" onClick={() => skip(-10)}>
              <Rewind className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-10 w-10 rounded-full" onClick={() => skip(10)}>
              <FastForward className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1 group/volume ml-1">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-10 w-10 rounded-full" onClick={toggleMute}>
                <VolumeIcon className="w-5 h-5" />
              </Button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300">
                <Slider value={[isMuted ? 0 : volume * 100]} onValueChange={handleVolumeChange} max={100} step={1} className="w-24" />
              </div>
            </div>
            <span className="text-sm text-white/80 ml-3 tabular-nums font-medium">
              {formatTime(currentTime)} <span className="text-white/50">/</span> {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-10 w-10 rounded-full">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 min-w-[160px] rounded-xl">
                <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">Velocidade</div>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <DropdownMenuItem key={speed} onClick={() => changePlaybackSpeed(speed)} className={cn('text-white/90 focus:bg-white/15 rounded-lg mx-1', playbackSpeed === speed && 'bg-primary/20 text-primary')}>
                    {speed === 1 ? 'Normal' : `${speed}x`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className={cn('text-white hover:bg-white/15 h-10 w-10 rounded-full', isPiP && 'text-primary bg-primary/20')} onClick={togglePiP} title="Picture-in-Picture">
              <PictureInPicture2 className="w-5 h-5" />
            </Button>

            {/* 4. O NOVO BOTÃO DE ESTICAR (STRETCH) */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105",
                isStretched && "text-primary bg-primary/20"
              )}
              onClick={toggleStretch}
              title={isStretched ? "Restaurar proporção" : "Esticar vídeo (Preencher)"}
            >
              <Expand className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-10 w-10 rounded-full" onClick={toggleFullscreen} title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
