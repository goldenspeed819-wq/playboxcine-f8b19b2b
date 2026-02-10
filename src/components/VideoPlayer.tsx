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
  Subtitles,
  MessageSquareOff,
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
import { useSubtitleStyles } from '@/hooks/useSubtitleStyles';


interface SubtitleTrack {
  id: string;
  language: string;
  subtitle_url: string;
}

interface VideoPlayerProps {
  src: string | null;
  poster?: string | null;
  title?: string;
  subtitles?: SubtitleTrack[];
  nextLabel?: string;
  onNextClick?: () => void;
  introStartTime?: number | null;
  introEndTime?: number | null;
  onTimeUpdate?: (currentTime: number) => void;
  initialTime?: number;
  onEnded?: () => void;
}

export function VideoPlayer({ src, poster, title, subtitles = [], nextLabel, onNextClick, introStartTime, introEndTime, onTimeUpdate, initialTime, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getSubtitleCSS } = useSubtitleStyles();
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
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Inject subtitle styles
  useEffect(() => {
    const styleId = 'subtitle-custom-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = getSubtitleCSS();
    
    return () => {
      // Cleanup only if component unmounts completely
    };
  }, [getSubtitleCSS]);

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
      onTimeUpdate?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setVideoError(null);
      // Set initial time if provided
      if (initialTime && initialTime > 0) {
        video.currentTime = initialTime;
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
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
  }, [src, onTimeUpdate, initialTime]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      // Unlock orientation when exiting fullscreen on mobile
      if (!isNowFullscreen) {
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            (screen.orientation as any).unlock();
          }
        } catch (error) {
          // Ignore errors
        }
      }
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

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  };

  // Lock screen to landscape on mobile
  const lockLandscape = async () => {
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (error) {
      // Screen orientation lock not supported or failed
      console.log('Screen orientation lock not available');
    }
  };

  // Unlock screen orientation
  const unlockOrientation = () => {
    try {
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock();
      }
    } catch (error) {
      // Ignore errors
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
      // Auto fullscreen when starting to play (if not already fullscreen)
      if (!isFullscreen && container) {
        try {
          await container.requestFullscreen?.();
          // Lock to landscape on mobile
          if (isMobile()) {
            await lockLandscape();
          }
        } catch (error) {
          // Fullscreen not supported or user denied
          console.log('Fullscreen request failed');
        }
      }
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

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      try {
        await container.requestFullscreen?.();
        // Lock to landscape on mobile
        if (isMobile()) {
          await lockLandscape();
        }
      } catch (error) {
        console.log('Fullscreen request failed');
      }
    } else {
      unlockOrientation();
      document.exitFullscreen?.();
    }
  };

  const toggleStretch = () => {
    setIsStretched(!isStretched);
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
        className={cn(
          "w-full h-full bg-black",
          isStretched ? "object-cover" : "object-contain"
        )}
        onClick={togglePlay}
        playsInline
        crossOrigin="anonymous"
      >
        {subtitles.map((sub) => (
          <track
            key={sub.id}
            kind="subtitles"
            label={sub.language}
            src={sub.subtitle_url}
            srcLang={sub.language.toLowerCase().slice(0, 2)}
            default={activeSubtitle === sub.id}
          />
        ))}
      </video>


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
          <div className="flex items-center gap-1">
            {/* Fullscreen - First on mobile for easy access */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105 md:order-last"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </Button>

            {/* Subtitles */}
            {subtitles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105',
                      activeSubtitle && 'text-primary bg-primary/20'
                    )}
                    title="Legendas"
                  >
                    <Subtitles className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 min-w-[160px] rounded-xl">
                  <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Legendas
                  </div>
                  <DropdownMenuItem
                    onClick={() => {
                      setActiveSubtitle(null);
                      const video = videoRef.current;
                      if (video) {
                        for (let i = 0; i < video.textTracks.length; i++) {
                          video.textTracks[i].mode = 'hidden';
                        }
                      }
                    }}
                    className={cn(
                      'text-white/90 focus:bg-white/15 focus:text-white rounded-lg mx-1',
                      !activeSubtitle && 'bg-primary/20 text-primary'
                    )}
                  >
                    <MessageSquareOff className="w-4 h-4 mr-2" />
                    Desativado
                    {!activeSubtitle && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {subtitles.map((sub) => (
                    <DropdownMenuItem
                      key={sub.id}
                      onClick={() => {
                        setActiveSubtitle(sub.id);
                        const video = videoRef.current;
                        if (video) {
                          for (let i = 0; i < video.textTracks.length; i++) {
                            video.textTracks[i].mode = video.textTracks[i].label === sub.language ? 'showing' : 'hidden';
                          }
                        }
                      }}
                      className={cn(
                        'text-white/90 focus:bg-white/15 focus:text-white rounded-lg mx-1',
                        activeSubtitle === sub.id && 'bg-primary/20 text-primary'
                      )}
                    >
                      {sub.language}
                      {activeSubtitle === sub.id && <span className="ml-auto text-primary">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
                    key={speed}
                    onClick={() => changePlaybackSpeed(speed)}
                    className={cn(
                      'text-white/90 focus:bg-white/15 focus:text-white rounded-lg mx-1',
                      playbackSpeed === speed && 'bg-primary/20 text-primary'
                    )}
                  >
                    {speed === 1 ? 'Normal' : `${speed}x`}
                    {playbackSpeed === speed && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Picture-in-Picture Mode */}
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

            {/* Stretch/Fill */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/15 h-10 w-10 rounded-full transition-all hover:scale-105',
                isStretched && 'text-primary bg-primary/20'
              )}
              onClick={toggleStretch}
              title={isStretched ? 'Ajustar à tela' : 'Preencher tela'}
            >
              <RectangleHorizontal className="w-5 h-5" />
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
}
