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
  Expand,
  Check,
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

  // Handlers originais
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
    if (!isFullscreen) container.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
    } catch (error) { console.error('PiP error:', error); }
  };

  const toggleStretch = () => setIsStretched(!isStretched);
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
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      
      const hasIntro = introStartTime != null && introEndTime != null;
      setShowSkipIntro(hasIntro && video.currentTime >= (introStartTime as number) && video.currentTime < (introEndTime as number));
      
      if (onNextClick && video.duration > 0) {
        setShowNextButton(((video.currentTime / video.duration) * 100) >= 90);
      }
    };

    const handleLoadedMetadata = () => { setDuration(video.duration); setIsLoading(false); };
    const handleProgress = () => {
      if (video.buffered.length > 0) setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('progress', handleProgress);
    };
  }, [src, introStartTime, introEndTime, onNextClick]);

  if (!src) return <div className="bg-black h-64 flex items-center justify-center text-white">Nenhum vídeo disponível</div>;

  return (
    <div
      ref={containerRef}
      className="group relative rounded-xl overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={cn("w-full h-full bg-black transition-all duration-300", isStretched ? "object-fill" : "object-contain")}
        onClick={togglePlay}
        playsInline
      />

      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}

      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-primary/90 hover:scale-110 flex items-center justify-center transition-all">
            <Play className="w-9 h-9 text-primary-foreground ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {showSkipIntro && isPlaying && (
        <div className="absolute bottom-28 right-6 z-10">
          <Button onClick={skipIntro} className="gap-2 bg-white/15 backdrop-blur-md text-white rounded-full px-6" size="lg">
            Pular Abertura <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {showNextButton && nextLabel && onNextClick && (
        <div className="absolute bottom-28 right-6 z-10">
          <Button onClick={onNextClick} className="gap-2 bg-primary text-white rounded-full px-6" size="lg">
            {nextLabel} <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/80 to-transparent transition-opacity">
          <h3 className="font-bold text-lg text-white">{title}</h3>
        </div>
      )}

      {/* CONTROLES ORIGINAIS */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-5 pb-4 pt-16 transition-all duration-300',
        showControls ? 'opacity-100' : 'opacity-0 translate-y-2 pointer-events-none'
      )}>
        <div className="relative mb-4 group/progress">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden relative cursor-pointer hover:h-2 transition-all">
            <div className="h-full bg-white/30 absolute left-0 top-0 rounded-full" style={{ width: `${buffered}%` }} />
            <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="absolute inset-0" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white" onClick={() => skip(-10)}><Rewind className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="text-white" onClick={() => skip(10)}><FastForward className="w-5 h-5" /></Button>
            
            <div className="flex items-center gap-1 group/volume ml-1">
              <Button variant="ghost" size="icon" className="text-white" onClick={toggleMute}><VolumeIcon className="w-5 h-5" /></Button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300">
                <Slider value={[isMuted ? 0 : volume * 100]} onValueChange={handleVolumeChange} max={100} className="w-24" />
              </div>
            </div>
            {/* CONTADOR ORIGINAL */}
            <span className="text-sm text-white/80 ml-3 tabular-nums font-medium">
              {formatTime(currentTime)} <span className="text-white/50">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white"><Settings className="w-5 h-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 text-white border-white/10 min-w-[160px] rounded-xl">
                <div className="px-3 py-2 text-xs font-semibold opacity-60 uppercase">Velocidade</div>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <DropdownMenuItem key={speed} onClick={() => changePlaybackSpeed(speed)} className="flex justify-between">
                    {speed}x {playbackSpeed === speed && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="text-white" onClick={togglePiP}><PictureInPicture2 className="w-5 h-5" /></Button>
            
            <Button variant="ghost" size="icon" className={cn("text-white", isStretched && "text-primary bg-primary/20")} onClick={toggleStretch}>
              <Expand className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" className="text-white" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
