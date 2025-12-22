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
  const [showNextButton, setShowNextButton] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** 🔴 ÚNICA ADIÇÃO */
  const [isStretched, setIsStretched] = useState(false);

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
    if (introStartTime != null && introEndTime != null) {
      setShowSkipIntro(currentTime >= introStartTime && currentTime < introEndTime);
    }
  }, [currentTime, introStartTime, introEndTime]);

  useEffect(() => {
    if (onNextClick && duration > 0) {
      const percent = (currentTime / duration) * 100;
      setShowNextButton(percent >= 90 || duration - currentTime <= 30);
    }
  }, [currentTime, duration, onNextClick]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const onLoaded = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(0) / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('progress', onProgress);

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('progress', onProgress);
    };
  }, [src]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : v.play();
  };

  const handleSeek = (v: number[]) => {
    if (!videoRef.current) return;
    const t = (v[0] / 100) * duration;
    videoRef.current.currentTime = t;
    setProgress(v[0]);
  };

  const handleVolumeChange = (v: number[]) => {
    if (!videoRef.current) return;
    const vol = v[0] / 100;
    videoRef.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    !isFullscreen
      ? containerRef.current.requestFullscreen()
      : document.exitFullscreen();
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : videoRef.current.requestPictureInPicture();
  };

  /** 🔴 FUNÇÃO DO BOTÃO ESTICAR */
  const toggleStretch = () => {
    setIsStretched(prev => !prev);
  };

  const formatTime = (t: number) =>
    `${Math.floor(t / 60)}:${Math.floor(t % 60)
      .toString()
      .padStart(2, '0')}`;

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden rounded-xl"
      onMouseMove={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        onClick={togglePlay}
        playsInline
        className="w-full h-full bg-black"
        style={{ objectFit: isStretched ? 'cover' : 'contain' }}
      />

      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black',
          !showControls && 'opacity-0 pointer-events-none'
        )}
      >
        <Slider value={[progress]} onValueChange={handleSeek} />

        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-2">
            <Button onClick={togglePlay} size="icon" variant="ghost">
              {isPlaying ? <Pause /> : <Play />}
            </Button>

            <Button onClick={() => toggleMute()} size="icon" variant="ghost">
              <VolumeIcon />
            </Button>

            <Slider
              value={[volume * 100]}
              onValueChange={handleVolumeChange}
              className="w-24"
            />

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Settings />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[0.5, 1, 1.5, 2].map(s => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.playbackRate = s;
                        setPlaybackSpeed(s);
                      }
                    }}
                  >
                    {s}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={togglePiP} size="icon" variant="ghost">
              <PictureInPicture2 />
            </Button>

            {/* 🔴 BOTÃO ESTICAR TELA (ÚNICO ADICIONADO) */}
            <Button
              onClick={toggleStretch}
              size="icon"
              variant="ghost"
              title="Esticar tela"
            >
              <Minimize />
            </Button>

            <Button onClick={toggleFullscreen} size="icon" variant="ghost">
              {isFullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
