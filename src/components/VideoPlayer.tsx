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
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Preferência do usuário: preencher tela
  const [isFillMode, setIsFillMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('video-fill-mode') === 'true';
  });

  // Salva preferência
  useEffect(() => {
    localStorage.setItem('video-fill-mode', String(isFillMode));
  }, [isFillMode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const timeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const loaded = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const progressEvent = () => {
      if (video.buffered.length > 0) {
        setBuffered(
          (video.buffered.end(video.buffered.length - 1) / video.duration) * 100
        );
      }
    };

    const error = () => {
      setVideoError('Erro ao carregar o vídeo');
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', timeUpdate);
    video.addEventListener('loadedmetadata', loaded);
    video.addEventListener('progress', progressEvent);
    video.addEventListener('error', error);

    return () => {
      video.removeEventListener('timeupdate', timeUpdate);
      video.removeEventListener('loadedmetadata', loaded);
      video.removeEventListener('progress', progressEvent);
      video.removeEventListener('error', error);
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    !isFullscreen
      ? containerRef.current.requestFullscreen()
      : document.exitFullscreen();
  };

  const toggleFillMode = () => {
    setIsFillMode(prev => !prev);
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!src) {
    return (
      <div className="flex items-center justify-center bg-black h-64 rounded-xl">
        <p className="text-white/60">Nenhum vídeo disponível</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden rounded-xl"
      onMouseMove={() => setShowControls(true)}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={cn(
          'w-full h-full bg-black',
          isFillMode ? 'object-cover' : 'object-contain'
        )}
        onClick={togglePlay}
      />

      {/* LOADING */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* CONTROLES */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-10">
        {/* PROGRESS */}
        <Slider
          value={[progress]}
          onValueChange={v => {
            if (!videoRef.current) return;
            videoRef.current.currentTime = (v[0] / 100) * duration;
          }}
          max={100}
          step={0.1}
        />

        <div className="flex items-center justify-between mt-3">
          {/* LEFT */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>

            <Button size="icon" variant="ghost" onClick={() => (videoRef.current!.currentTime -= 10)}>
              <Rewind />
            </Button>

            <Button size="icon" variant="ghost" onClick={() => (videoRef.current!.currentTime += 10)}>
              <FastForward />
            </Button>

            <span className="text-white/80 text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-1">
            {/* SETTINGS */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Settings />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.playbackRate = speed;
                        setPlaybackSpeed(speed);
                      }
                    }}
                  >
                    {speed}x {playbackSpeed === speed && '✓'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 🔥 FILL MODE */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFillMode}
              title="Preencher tela"
              className={isFillMode ? 'text-primary' : ''}
            >
              {isFillMode ? <Minimize /> : <Maximize />}
            </Button>

            {/* PIP */}
            <Button size="icon" variant="ghost" onClick={togglePiP}>
              <PictureInPicture2 />
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
