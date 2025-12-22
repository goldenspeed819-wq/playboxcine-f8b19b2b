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
  Crop,
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
  introStartTime?: number | null;
  introEndTime?: number | null;
}

export function VideoPlayer({
  src,
  poster,
  title,
  introStartTime,
  introEndTime,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isFillMode, setIsFillMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isMobile =
    typeof window !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  /* ==================== VIDEO EVENTS ==================== */

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

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [src]);

  useEffect(() => {
    const onFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  /* ==================== CONTROLS ==================== */

  const togglePlay = () => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
  };

  const handleSeek = (v: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = (v[0] / 100) * duration;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolume = (v: number[]) => {
    if (!videoRef.current) return;
    const vol = v[0] / 100;
    videoRef.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    !isFullscreen
      ? containerRef.current.requestFullscreen()
      : document.exitFullscreen();
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.current.requestPictureInPicture();
    }
    setIsPiP(!isPiP);
  };

  const toggleFillMode = () => {
    setIsFillMode((prev) => !prev);
  };

  const skip = (sec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += sec;
  };

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  /* ==================== RENDER ==================== */

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={cn(
          'w-full h-full bg-black transition-all duration-300',
          isFillMode ? 'object-cover' : 'object-contain'
        )}
        onClick={togglePlay}
        playsInline
      />

      {/* CONTROLS */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10 bg-gradient-to-t from-black/90 via-black/60',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* PROGRESS */}
        <Slider value={[progress]} max={100} step={0.1} onValueChange={handleSeek} />

        <div className="flex justify-between items-end mt-3 text-white">
          {/* LEFT */}
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>

            <Button size="icon" variant="ghost" onClick={() => skip(-10)}>
              <Rewind />
            </Button>

            <Button size="icon" variant="ghost" onClick={() => skip(10)}>
              <FastForward />
            </Button>

            <Button size="icon" variant="ghost" onClick={toggleMute}>
              <VolumeIcon />
            </Button>

            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              onValueChange={handleVolume}
              className="w-24"
            />
          </div>

          {/* RIGHT */}
          <div className="flex items-end gap-3">
            {/* BOTÕES AVANÇADOS (somem no fullscreen mobile) */}
            {!(isMobile && isFullscreen) && (
              <>
                {/* SETTINGS */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Settings />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() =>
                          videoRef.current &&
                          (videoRef.current.playbackRate = s)
                        }
                      >
                        {s}x
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* PIP */}
                <Button size="icon" variant="ghost" onClick={togglePiP}>
                  <PictureInPicture2 />
                </Button>

                {/* TELA ESTICADA */}
                <div className="flex flex-col items-center leading-none">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleFillMode}
                    className={cn(isFillMode && 'text-primary bg-primary/20')}
                  >
                    <Crop />
                  </Button>
                  <span className="text-[10px] text-white/70 mt-0.5">
                    Tela Esticada
                  </span>
                </div>
              </>
            )}

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
