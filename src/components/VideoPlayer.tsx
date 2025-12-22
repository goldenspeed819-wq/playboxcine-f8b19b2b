import { useRef, useState, useEffect } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  src: string
  poster?: string
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)

  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

  const [fullscreen, setFullscreen] = useState(false)
  const [fill, setFill] = useState(false)

  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [previewX, setPreviewX] = useState(0)
  const [dragging, setDragging] = useState(false)

  /* ▶️ PLAY */
  const togglePlay = () => {
    if (!videoRef.current) return
    videoRef.current.paused
      ? videoRef.current.play()
      : videoRef.current.pause()
  }

  /* 🔊 VOLUME */
  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.volume = volume
    videoRef.current.muted = muted
  }, [volume, muted])

  /* ⏱️ TIME UPDATE */
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

  /* 🧭 FULLSCREEN */
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

  /* 🖼️ BIG PICTURE */
  const togglePiP = async () => {
    if (!videoRef.current) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else if (document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture()
    }
  }

  /* ⏱️ FORMATADOR COM HORAS */
  const formatTime = (t: number) => {
    if (!isFinite(t)) return "0:00"
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const s = Math.floor(t % 60)

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`
    }
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  /* 📌 POSIÇÃO NA TIMELINE */
  const getTimeFromEvent = (e: React.MouseEvent) => {
    if (!timelineRef.current) return 0
    const rect = timelineRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    return (x / rect.width) * duration
  }

  /* 🖼️ PREVIEW */
  const onMoveTimeline = (e: React.MouseEvent) => {
    if (!previewRef.current || !videoRef.current) return

    const time = getTimeFromEvent(e)
    previewRef.current.currentTime = time

    const rect = timelineRef.current!.getBoundingClientRect()
    setPreviewX(e.clientX - rect.left)
    setPreviewTime(time)

    if (dragging) {
      videoRef.current.currentTime = time
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden"
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
      />

      {/* CONTROLES */}
      <div className="absolute bottom-0 w-full px-4 pb-3 pt-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent">

        {/* TIMELINE */}
        <div
          ref={timelineRef}
          className="relative mb-3"
          onMouseMove={onMoveTimeline}
          onMouseLeave={() => {
            setPreviewTime(null)
            setDragging(false)
          }}
          onMouseDown={e => {
            setDragging(true)
            if (videoRef.current) {
              videoRef.current.currentTime = getTimeFromEvent(e)
            }
          }}
          onMouseUp={() => setDragging(false)}
        >
          {/* PREVIEW */}
          {previewTime !== null && (
            <div
              style={{
                position: "absolute",
                left: previewX - 60,
                bottom: 22,
                width: 120,
                height: 68,
                background: "black",
                borderRadius: 6,
                overflow: "hidden",
                pointerEvents: "none",
              }}
            >
              <video
                ref={previewRef}
                src={src}
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}

          <Slider
            value={[progress]}
            step={0.1}
            onValueChange={v => {
              if (!videoRef.current) return
              videoRef.current.currentTime = (v[0] / 100) * duration
            }}
          />
        </div>

        {/* BARRA INFERIOR */}
        <div className="flex items-center justify-between text-white">

          {/* ESQUERDA */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={togglePlay}>
              {playing ? <Pause /> : <Play />}
            </Button>

            <span className="text-sm">
              {formatTime(current)} / {formatTime(duration)}
            </span>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>

            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={v => setVolume(v[0])}
              className="w-24"
            />
          </div>

          {/* DIREITA */}
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost">
              <Settings />
            </Button>

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
