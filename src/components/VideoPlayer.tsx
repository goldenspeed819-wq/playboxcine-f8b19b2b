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
  Expand, // Ícone para a função de esticar
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
  const [isStretched, setIsStretched] = useState(false); // Estado para controlar o preenchimento da tela
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Limpa estados quando o vídeo muda
  useEffect(() => {
    setVideoError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  // Lógica para pular introdução
  useEffect(() => {
    const hasIntro = introStartTime != null && introEndTime != null;
    if (hasIntro && currentTime >= introStartTime && currentTime < introEndTime) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
  }, [currentTime, introStartTime, introEndTime]);

  // Lógica para mostrar botão de próximo
  useEffect(() => {
    if (onNextClick && duration > 0) {
      const timeRemaining = duration - currentTime;
      const percentComplete = (currentTime / duration) * 100;
      setShowNextButton(percentComplete >= 90 || timeRemaining <= 30);
    } else {
      setShowNextButton(false);
    }
  }, [currentTime, duration, onNextClick]);

  // Eventos do elemento de vídeo
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
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLeavePiP = () => setIsPiP(false);
    const handleEnterPiP = () => setIsPiP(true);
    const handleError = () => {
      setVideoError("Erro ao carregar o vídeo. Verifique o formato.");
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  // Monitora Fullscreen
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
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
  };

  const toggleStretch = () => setIsStretched(!isStretched);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) { console.error(e); }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!src) return <div className="h-full w-full bg-black flex items-center justify-center text-white">Sem vídeo</div>;

  return (
    <div
      ref={containerRef}
      className="video-player-container group relative rounded-xl overflow-hidden bg-black w-full aspect-video"
      onMouseMove={handleMouseMove}
    >
      {/* Video Element com Classe Dinâmica para Esticar */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={cn(
          "w-full h-full transition-all duration-300",
          isStretched ? "object-fill" : "object-contain"
        )}
        onClick={togglePlay}
        playsInline
      />

      {/* Botão de Pular Introdução */}
      {showSkipIntro && (
        <Button 
          onClick={() => videoRef.current && (videoRef.current.currentTime = introEndTime!)}
          className="absolute bottom-24 right-6 z-20 bg-white/20 backdrop-blur-md text-white border-white/30 rounded-full"
        >
          Pular Intro <ChevronRight className="ml-1 w-4 h-4" />
        </Button>
      )}

      {/* Controls Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 flex flex-col justify-end p-4",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        
        {/* Progress Slider */}
        <Slider 
          value={[progress]} 
          max={100} 
          step={0.1} 
          onValueChange={(v) => {
            if (videoRef.current) {
              const newTime = (v[0] / 100) * videoRef.current.duration;
              videoRef.current.currentTime = newTime;
            }
          }}
          className="mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play fill="currentColor" />}
            </Button>
            
            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Configurações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white"><Settings className="w-5 h-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/90 text-white border-white/10">
                {[0.5, 1, 1.5, 2].map(speed => (
                  <DropdownMenuItem key={speed} onClick={() => {
                    if(videoRef.current) videoRef.current.playbackRate = speed;
                    setPlaybackSpeed(speed);
                  }}>
                    {speed}x {playbackSpeed === speed && "✓"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Picture in Picture */}
            <Button variant="ghost" size="icon" className="text-white" onClick={togglePiP}>
              <PictureInPicture2 className="w-5 h-5" />
            </Button>

            {/* BOTÃO ESTICAR (Novo) */}
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("text-white transition-colors", isStretched && "text-primary bg-primary/20")} 
              onClick={toggleStretch}
              title="Esticar Vídeo"
            >
              <Expand className="w-5 h-5" />
            </Button>

            {/* Fullscreen */}
            <Button variant="ghost" size="icon" className="text-white" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
