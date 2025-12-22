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
  Expand, // IMPORTANTE: Certifique-se que o Expand está aqui
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
  
  // 1. NOVO ESTADO: Controla se a tela está esticada
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

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
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

  // 2. NOVA FUNÇÃO: Alterna o modo esticar
  const toggleStretch = () => {
    setIsStretched(!isStretched);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!src) return <div className="h-64 w-full bg-black flex items-center justify-center text-white">Sem vídeo disponível</div>;

  return (
    <div
      ref={containerRef}
      className="video-player-container group relative rounded-xl overflow-hidden bg-black w-full aspect-video"
      onMouseMove={() => setShowControls(true)}
    >
      {/* 3. APLICAÇÃO DO ESTICAR: object-fill vs object-contain */}
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

      {/* Controles */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        
        {/* Progress Slider */}
        <Slider 
          value={[progress]} 
          max={100} 
          onValueChange={(v) => {
            if (videoRef.current) videoRef.current.currentTime = (v[0] / 100) * duration;
          }}
          className="mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play fill="white" />}
            </Button>
            <span className="text-white text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Configurações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white"><Settings /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black text-white">
                <DropdownMenuItem onClick={() => { if(videoRef.current) videoRef.current.playbackRate = 2; }}>2x Speed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if(videoRef.current) videoRef.current.playbackRate = 1; }}>Normal Speed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Picture-in-Picture */}
            <Button variant="ghost" size="icon" className="text-white" onClick={togglePiP}>
              <PictureInPicture2 />
            </Button>

            {/* 4. BOTÃO ESTICAR (FORÇADO NO LUGAR CERTO) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStretch}
              className={cn(
                "h-10 w-10 rounded-full transition-all",
                isStretched ? "text-primary bg-primary/20" : "text-white"
              )}
              title="Esticar Vídeo"
            >
              <Expand className="w-5 h-5" />
            </Button>

            {/* Fullscreen */}
            <Button variant="ghost" size="icon" className="text-white" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
