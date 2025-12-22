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

  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fill, setFill] = useState(false)

  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [previewX, setPreviewX] = useState(0)

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

  /* ⏱️ TEMPO */
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

  /* 🖼️ PiP */
  const togglePiP = async () => {
    if (!videoRef.current) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else {
      await videoRef.current.requestPictureInPicture()
    }
  }

  /* 📐 PREVIEW (PEQUENO) */
  const onMoveTimeline = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !previewRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * duration

    previewRef.current.currentTime = time
    setPreviewTime(time)
    setPreviewX(e.clientX - rect.left)
  }

  const format = (t: number) => {
    if (!t) return "0:00"
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden rounded-xl"
    >
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
      <div className="absolute bottom-0 w-full p-3 bg-gradient-to-t from-black/80 to-transparent">

        {/* TIMELINE */}
        <div
          className="relative mb-2"
          onMouseMove={onMoveTimeline}
          onMouseLeave={() => setPreviewTime(null)}
        >
          {previewTime !== null && (
            <div
              style={{
                position: "absolute",
                left: previewX - 60,
                bottom: 24,
                width: 120,
                height: 68,
                background: "black",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <video
                ref={previewRef}
                src={src}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}

          <Slider
            value={[progress]}
            onValueChange={v => {
              if (!videoRef.current) return
              videoRef.current.currentTime = (v[0] / 100) * duration
            }}
          />
        </div>

        {/* BOTÕES */}
        <div className="flex items-center gap-2 text-white">
          <Button size="icon" variant="ghost" onClick={togglePlay}>
            {playing ? <Pause /> : <Play />}
          </Button>

          <span className="text-sm">
            {format(current)} / {format(duration)}
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

          <Button size="icon" variant="ghost" onClick={() => setFill(!fill)}>
            <Crop />
          </Button>

          <Button size="icon" variant="ghost" onClick={togglePiP}>
            <PictureInPicture2 />
          </Button>

          <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>
    </div>
  )
}
