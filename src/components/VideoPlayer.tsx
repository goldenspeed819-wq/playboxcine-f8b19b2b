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
  RotateCcw,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)

  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

  const [fullscreen, setFullscreen] = useState(false)
  const [fill, setFill] = useState(false)

  const [draggingTime, setDraggingTime] = useState(false)
  const [draggingVolume, setDraggingVolume] = useState(false)

  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [previewX, setPreviewX] = useState(0)

  /* PLAY */
  const togglePlay = () => {
    if (!videoRef.current) return
    videoRef.current.paused
      ? videoRef.current.play()
      : videoRef.current.pause()
  }

  /* TIME */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const update = () => {
      setCurrent(v.currentTime)
      setDuration(v.duration || 0)
      setProgress((v.currentTime / v.duration) * 100 || 0)
    }

    v.addEventListener("timeupdate", update)
    v.addEventListener("loadedmetadata", update)

    return () => {
      v.removeEventListener("timeupdate", update)
      v.removeEventListener("loadedmetadata", update)
    }
  }, [])

  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const s = Math.floor(t % 60)
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`
  }

  /* FULLSCREEN */
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    !document.fullscreenElement
      ? containerRef.current.requestFullscreen()
      : document.exitFullscreen()
  }

  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", fn)
    return () => document.removeEventListener("fullscreenchange", fn)
  }, [])

  /* PiP */
  const togglePiP = async () => {
    if (!videoRef.current) return
    document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : videoRef.current.requestPictureInPicture()
  }

  /* CALC TIME */
  const calcTime = (x: number) => {
    if (!timelineRef.current) return 0
    const r = timelineRef.current.getBoundingClientRect()
    return Math.min(Math.max(0, (x - r.left) / r.width), 1) * duration
  }

  const calcVolume = (x: number) => {
    if (!volumeRef.current) return 1
    const r = volumeRef.current.getBoundingClientRect()
    return Math.min(Math.max(0, (x - r.left) / r.width), 1)
  }

  /* GLOBAL DRAG */
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (draggingTime && videoRef.current) {
        videoRef.current.currentTime = calcTime(e.clientX)
      }
      if (draggingVolume && videoRef.current) {
        const v = calcVolume(e.clientX)
        setVolume(v)
        videoRef.current.volume = v
        setMuted(v === 0)
      }
    }

    const up = () => {
      setDraggingTime(false)
      setDraggingVolume(false)
    }

    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)

    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
  }, [draggingTime, draggingVolume])

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden"
      style={{ width: 830, height: 560 }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn(
          "absolute inset-0 w-full h-full",
          fill ? "object-cover" : "object-contain"
        )}
        muted={muted}
      />

      {/* CONTROLES */}
      <div className="absolute bottom-0 w-full px-4 pb-3 pt-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white">

        {/* TIMELINE */}
        <div
          ref={timelineRef}
          className="relative mb-4 h-3 cursor-pointer"
          onMouseMove={e => {
            const t = calcTime(e.clientX)
            setPreviewTime(t)
            setPreviewX(e.nativeEvent.offsetX)
            if (previewRef.current) previewRef.current.currentTime = t
          }}
          onMouseLeave={() => !draggingTime && setPreviewTime(null)}
          onMouseDown={e => {
            setDraggingTime(true)
            if (videoRef.current)
              videoRef.current.currentTime = calcTime(e.clientX)
          }}
        >
          {previewTime !== null && (
            <div
              className="absolute bottom-6 bg-black rounded overflow-hidden"
              style={{ left: previewX - 60, width: 120, height: 70 }}
            >
              <video
                ref={previewRef}
                src={src}
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="absolute inset-0 bg-white/20 rounded-full" />
          <div
            className="absolute inset-y-0 left-0 bg-red-600 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        {/* BOTÕES */}
        <div className="flex items-center justify-between">

          {/* ESQUERDA */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => {
              if (videoRef.current) videoRef.current.currentTime -= 10
            }}>
              <RotateCcw />
            </Button>

            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {playing ? <Pause /> : <Play />}
            </Button>

            <Button size="icon" variant="ghost" onClick={() => {
              if (videoRef.current) videoRef.current.currentTime += 10
            }}>
              <RotateCw />
            </Button>

            <span className="text-sm">
              {formatTime(current)} / {formatTime(duration)}
            </span>
          </div>

          {/* DIREITA */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>

            <div
              ref={volumeRef}
              className="relative w-24 h-2 cursor-pointer"
              onMouseDown={e => {
                setDraggingVolume(true)
                const v = calcVolume(e.clientX)
                setVolume(v)
                if (videoRef.current) videoRef.current.volume = v
              }}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              <div
                className="absolute inset-y-0 left-0 bg-red-600 rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full"
                style={{ left: `calc(${volume * 100}% - 8px)` }}
              />
            </div>

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
