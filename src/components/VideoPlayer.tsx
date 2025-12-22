import { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function VideoPlayer({ src, poster }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const [hoverX, setHoverX] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);

  /* ---------------- EVENTS ---------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      setTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const loaded = () => setDuration(video.duration);

    video.addEventListener('timeupdate', update);
    video.addEventListener('loadedmetadata', loaded);

    return () => {
      video.removeEventListener('timeupdate', update);
      video.removeEventListener('loadedmetadata', loaded);
    };
  }, []);

  useEffect(() => {
    const fs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);
    return () => document.removeEventListener('fullscreenchange', fs);
  }, []);

  /* ---------------- UTILS ---------------- */

  const format = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s
          .toString()
          .padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const calcTime = (clientX: number) => {
    const rect = timelineRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    return {
      x,
      time: (x / rect.width) * duration,
    };
  };

  /* ---------------- ACTIONS ---------------- */

  const togglePlay = () => {
    playing ? videoRef.current!.pause() : videoRef.current!.play();
    setPlaying(!playing);
  };

  const toggleFullscreen = () => {
    !fullscreen
      ? containerRef.current!.requestFullscreen()
      : document.exitFullscreen();
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden"
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      />

      {/* PREVIEW VIDEO */}
      {hoverTime !== null && (
        <div
          className="absolute bottom-24 z-20"
          style={{ left: hoverX, transform: 'translateX(-50%)' }}
        >
          <video
            ref={previewRef}
            src={src}
            muted
            className="w-40 h-24 object-cover rounded-md border border-black"
            style={{ background: '#000' }}
            onLoadedMetadata={() =>
              (previewRef.current!.currentTime = hoverTime)
            }
          />
          <div className="text-xs text-center mt-1 text-white">
            {format(hoverTime)}
          </div>
        </div>
      )}

      {/* TIMELINE */}
      <div className="absolute bottom-20 left-4 right-4">
        <div
          ref={timelineRef}
          className="relative h-2 bg-white/30 rounded cursor-pointer"
          onMouseDown={e => {
            setScrubbing(true);
            const { time } = calcTime(e.clientX);
            videoRef.current!.currentTime = time;
          }}
          onMouseMove={e => {
            const { time, x } = calcTime(e.clientX);
            setHoverX(x);
            setHoverTime(time);
            previewRef.current &&
              (previewRef.current.currentTime = time);
            if (scrubbing) videoRef.current!.currentTime = time;
          }}
          onMouseLeave={() => {
            setHoverTime(null);
            setScrubbing(false);
          }}
          onMouseUp={() => setScrubbing(false)}
        >
          {/* PROGRESS */}
          <div
            className="absolute h-full bg-red-500 rounded"
            style={{ width: `${progress}%` }}
          />

          {/* HEAD */}
          <div
            className="absolute top-1/2 w-3 h-3 bg-black rounded-full -translate-y-1/2"
            style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/90 flex justify-between items-center">
        <div className="flex items-center gap-2 text-white">
          <Button size="icon" variant="ghost" onClick={togglePlay}>
            {playing ? <Pause /> : <Play />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMuted(!muted)}
          >
            {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>

          {/* VOLUME SLIDER */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={e => {
              const v = Number(e.target.value);
              setVolume(v);
              videoRef.current!.volume = v;
              setMuted(v === 0);
            }}
            className="w-24 accent-red-500"
            style={{
              accentColor: 'red',
            }}
          />

          <span className="text-sm">
            {format(time)} / {format(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <Settings />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[0.5, 1, 1.25, 1.5, 2].map(v => (
                <DropdownMenuItem
                  key={v}
                  className={cn(speed === v && 'text-red-500 font-bold')}
                  onClick={() => {
                    videoRef.current!.playbackRate = v;
                    setSpeed(v);
                  }}
                >
                  {v}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>
    </div>
  );
}
