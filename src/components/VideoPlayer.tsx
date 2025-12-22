import { useEffect, useRef, useState } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Crop,
  Settings,
  Rewind,
  FastForward,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  src: string
  poster?: string
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<NodeJS.Timeout | null>(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fill, setFill] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [speed, setSpeed] = useState(1)

  /* ---------------- PLAY STATE REAL ---------------- */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    v.addEventListener("play", onPlay)
    v.addEventListener("pause", onPause)

    return () => {
      v.removeEventListener("play", onPlay)
      v.removeEventListener("pause", onPause)
    }
  }, [])

  /* ---------------- TIME ---------------- */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const update = () => setCurrent(v.currentTime)
    const loaded = () => setDuration(v.duration)

    v.addEventListener("timeupdate", update)
    v.addEventListener("loadedmetadata", loaded)

    return () => {
      v.removeEventListener("timeupdate", update)
      v.removeEventListener("loadedmetadata", loaded)
    }
  }, [])

  /* ---------------- FULLSCREEN ---------------- */
  useEffect(() => {
    const f = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", f)
    return () => document.removeEventListener("fullscreenchange", f)
  }, [])

  /* ---------------- AUTO HIDE CONTROLS ---------------- */
  const resetHideTimer = () => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)

    hideTimer.current = setTimeout(() => {
      if (playing && !dragging) setShowControls(false)
    }, 4000)
  }

  useEffect(() => {
    resetHideTimer()
  }, [playing])

  /* ---------------- KEYBOARD ---------------- */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      resetHideTimer()
      if (!videoRef.current) return

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault()
          togglePlay()
          break
        case "arrowright":
          videoRef.current.currentTime += 10
          break
        case "arrowleft":
          videoRef.current.currentTime -= 10
          break
        case "arrowup":
          setVolume(v => Math.min(1, v + 0.1))
          break
        case "arrowdown":
          setVolume(v => Math.max(0, v - 0.1))
          break
        case "m":
          setMuted(m => !m)
          break
        case "f":
          toggleFullscreen()
          break
      }
    }

    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])

  /* ---------------- ACTIONS ---------------- */
  const togglePlay = () => {
    if (!videoRef.current) return
    playing ? videoRef.current.pause() : videoRef.current.play()
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    fullscreen
      ? document.exitFullscreen()
      : containerRef.current.requestFullscreen()
  }

  const togglePiP = async () => {
    if (!videoRef.current) return
    document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : videoRef.current.requestPictureInPicture()
  }

  const seek = (e: React.MouseEvent) => {
    if (!timelineRef.current || !videoRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / rect.width)
    )
    videoRef.current.currentTime = percent * duration
  }

  const format = (t: number) => {
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const s = Math.floor(t % 60)
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = muted
      videoRef.current.playbackRate = speed
    }
  }, [volume, muted, speed])

  const VolumeIcon = muted || volume === 0 ? VolumeX : Volume2

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden"
      style={{ width: 830, height: 560 }}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn(
          "w-full h-full",
          fill ? "object-cover" : "object-contain"
        )}
        onClick={togglePlay}
        playsInline
      />

      {/* CONTROLS */}
      <div
        className={cn(
          "absolute bottom-0 w-full px-4 pb-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300",
          !showControls && "opacity-0 pointer-events-none"
        )}
      >
        {/* TIMELINE */}
        <div
          ref={timelineRef}
          className="relative h-2 bg-neutral-700 rounded cursor-pointer"
          onMouseDown={e => {
            setDragging(true)
            seek(e)
          }}
          onMouseMove={e => dragging && seek(e)}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <div
            className="absolute h-full bg-red-600 rounded"
            style={{ width: `${(current / duration) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-black border-2 border-red-600 rounded-full"
            style={{ left: `${(current / duration) * 100}%` }}
          />
        </div>

        {/* BUTTONS */}
        <div className="flex justify-between items-center mt-3 text-white">
          {/* LEFT */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              <span
                className={cn(
                  "transition-transform duration-200",
                  playing && "scale-110"
                )}
              >
                {playing ? <Pause /> : <Play />}
              </span>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => (videoRef.current!.currentTime -= 10)}
            >
              <Rewind />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => (videoRef.current!.currentTime += 10)}
            >
              <FastForward />
            </Button>

            <Button size="icon" variant="ghost" onClick={() => setMuted(!muted)}>
              <VolumeIcon />
            </Button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="w-24 accent-red-600"
            />

            <span className="text-sm">
              {format(current)} / {format(duration)}
            </span>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-1">
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
                    onClick={() => setSpeed(v)}
                    className={cn(
                      speed === v && "text-red-500 font-semibold"
                    )}
                  >
                    {v}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="icon" variant="ghost" onClick={togglePiP}>
              <PictureInPicture2 />
            </Button>

            <Button size="icon" variant="ghost" onClick={() => setFill(!fill)}>
              <Crop />
            </Button>

            <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
