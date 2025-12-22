import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture2,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  RectangleHorizontal,
} from "lucide-react";

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // ⏱ esconder controles após 4s
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 4000);
    return () => clearTimeout(timer);
  }, [showControls]);

  // ▶️ Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // ⛶ Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ▭ Esticar tela (modo cinema)
  const toggleTheaterMode = () => {
    setIsTheater((prev) => !prev);
  };

  // 📺 Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.current.requestPictureInPicture();
    }
  };

  // 🔊 Volume
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black select-none mx-auto ${
        isTheater ? "w-full max-w-[1200px]" : "w-[830px]"
      }`}
      onMouseMove={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        width={830}
        height={560}
        className="w-full h-auto"
        src="/video.mp4"
        onClick={togglePlay}
      />

      {/* CONTROLES */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-between">
          {/* ESQUERDA */}
          <div className="flex items-center gap-3">
            <button onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white animate-pulse" />
              ) : (
                <Play className="w-6 h-6 text-white animate-pulse" />
              )}
            </button>

            <button
              onClick={() =>
                videoRef.current &&
                (videoRef.current.currentTime -= 10)
              }
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={() =>
                videoRef.current &&
                (videoRef.current.currentTime += 10)
              }
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>

            <button onClick={toggleMute}>
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                if (videoRef.current) videoRef.current.volume = v;
              }}
            />
          </div>

          {/* DIREITA */}
          <div className="flex items-center gap-3">
            <button title="Configurações">
              <Settings className="w-5 h-5 text-white" />
            </button>

            <button onClick={togglePiP} title="Modo Picture-in-Picture">
              <PictureInPicture2 className="w-5 h-5 text-white" />
            </button>

            {/* BOTÃO ESTICAR TELA */}
            <button onClick={toggleTheaterMode} title="Esticar tela">
              <RectangleHorizontal className="w-5 h-5 text-white" />
            </button>

            {/* FULLSCREEN */}
            <button onClick={toggleFullscreen} title="Tela cheia">
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-white" />
              ) : (
                <Maximize className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
