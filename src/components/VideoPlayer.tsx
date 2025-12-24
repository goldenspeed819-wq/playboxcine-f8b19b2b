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
  RectangleHorizontal,
  Square,
  X,
} from 'lucide-react';

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
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    const hasIntro = introStartTime != null && introEndTime != null;
    if (hasIntro && currentTime >= introStartTime && currentTime < introEndTime) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
  }, [currentTime, introStartTime, introEndTime]);

  useEffect(() => {
    if (onNextClick && duration > 0) {
      const timeRemaining = duration - currentTime;
      const percentComplete = (currentTime / duration) * 100;
      setShowNextButton(percentComplete >= 90 || timeRemaining <= 30);
    } else {
      setShowNextButton(false);
    }
  }, [currentTime, duration, onNextClick]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setVideoError(null);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleLeavePiP = () => setIsPiP(false);
    const handleEnterPiP = () => setIsPiP(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      setVideoError(null);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleError = () => {
      const error = video.error;
      let errorMessage = 'Erro ao carregar o vídeo';
      if (error) {
        switch (error.code) {
          case 1:
            errorMessage = 'Carregamento do vídeo foi interrompido';
            break;
          case 2:
            errorMessage = 'Erro de rede ao carregar o vídeo';
            break;
          case 3:
            errorMessage = 'Formato de vídeo não suportado pelo navegador';
            break;
          case 4:
            errorMessage = 'Vídeo não encontrado ou inacessível';
            break;
        }
      }
      setVideoError(errorMessage);
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    video.currentTime = newTime;
    setProgress(percent * 100);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.volume = percent;
    setVolume(percent);
    setIsMuted(percent === 0);
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
    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const toggleStretch = () => {
    setIsStretched(!isStretched);
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const skipIntro = () => {
    const video = videoRef.current;
    if (!video || !introEndTime) return;
    video.currentTime = introEndTime;
  };

  const changePlaybackSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(99, 102, 241, 0.3)',
    color: '#818cf8',
  };

  if (!src) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.9)',
        borderRadius: 12,
        aspectRatio: '16/9',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Play style={{ width: 64, height: 64, color: '#666', marginBottom: 16 }} />
          <p style={{ color: '#666' }}>Nenhum vídeo disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#000',
        aspectRatio: '16/9',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          objectFit: isStretched ? 'cover' : 'contain',
          transition: 'object-fit 0.3s',
        }}
        onClick={togglePlay}
        playsInline
      />

      {isLoading && !videoError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
        }}>
          <div style={{
            width: 48,
            height: 48,
            border: '4px solid #6366f1',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {videoError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)',
        }}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertCircle style={{ width: 32, height: 32, color: '#ef4444' }} />
            </div>
            <p style={{ color: '#ef4444', fontWeight: 500, marginBottom: 8 }}>{videoError}</p>
            <p style={{ color: '#666', fontSize: 14 }}>Verifique se o vídeo está em formato compatível (MP4, WebM)</p>
          </div>
        </div>
      )}

      {!isPlaying && !videoError && !isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
        }}>
          <button
            onClick={togglePlay}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.9)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.background = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)';
            }}
          >
            <Play style={{ width: 36, height: 36, color: 'white', marginLeft: 4 }} fill="white" />
          </button>
        </div>
      )}

      {showSkipIntro && isPlaying && (
        <div style={{ position: 'absolute', bottom: 112, right: 24, zIndex: 10 }}>
          <button
            onClick={skipIntro}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 9999,
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Pular Abertura
            <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        </div>
      )}

      {showNextButton && nextLabel && onNextClick && (
        <div style={{ position: 'absolute', bottom: 112, right: 24, zIndex: 10 }}>
          <button
            onClick={onNextClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#6366f1',
              border: 'none',
              borderRadius: 9999,
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {nextLabel}
            <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        </div>
      )}

      {title && showControls && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 20,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.4), transparent)',
          transition: 'opacity 0.3s',
        }}>
          <h3 style={{ fontWeight: 700, fontSize: 18, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {title}
          </h3>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7), transparent)',
          padding: '64px 20px 16px',
          transition: 'all 0.3s',
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translateY(0)' : 'translateY(8px)',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div
          onClick={handleSeek}
          style={{
            position: 'relative',
            height: 6,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 9999,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 9999,
              width: `${buffered}%`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              background: '#6366f1',
              borderRadius: 9999,
              width: `${progress}%`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              left: `${progress}%`,
              width: 14,
              height: 14,
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button style={buttonStyle} onClick={togglePlay}>
              {isPlaying ? <Pause style={{ width: 20, height: 20 }} fill="white" /> : <Play style={{ width: 20, height: 20, marginLeft: 2 }} fill="white" />}
            </button>

            <button style={buttonStyle} onClick={() => skip(-10)} title="Voltar 10s">
              <Rewind style={{ width: 20, height: 20 }} />
            </button>

            <button style={buttonStyle} onClick={() => skip(10)} title="Avançar 10s">
              <FastForward style={{ width: 20, height: 20 }} />
            </button>

            <div
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button style={buttonStyle} onClick={toggleMute}>
                <VolumeIcon style={{ width: 20, height: 20 }} />
              </button>
              <div
                style={{
                  width: showVolumeSlider ? 96 : 0,
                  overflow: 'hidden',
                  transition: 'width 0.3s',
                }}
              >
                <div
                  onClick={handleVolumeChange}
                  style={{
                    width: 96,
                    height: 4,
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      background: 'white',
                      borderRadius: 9999,
                      width: `${(isMuted ? 0 : volume) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginLeft: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
              {formatTime(currentTime)} <span style={{ color: 'rgba(255,255,255,0.5)' }}>/</span> {formatTime(duration)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                style={buttonStyle}
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                title="Configurações"
              >
                <Settings style={{ width: 20, height: 20 }} />
              </button>
              {showSpeedMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 48,
                    right: 0,
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 8,
                    minWidth: 140,
                    zIndex: 50,
                  }}
                >
                  <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Velocidade
                  </div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changePlaybackSpeed(speed)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 12px',
                        background: playbackSpeed === speed ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: playbackSpeed === speed ? '#818cf8' : 'rgba(255,255,255,0.9)',
                        cursor: 'pointer',
                        fontSize: 14,
                        textAlign: 'left',
                      }}
                    >
                      {speed === 1 ? 'Normal' : `${speed}x`}
                      {playbackSpeed === speed && <span style={{ color: '#818cf8' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              style={isPiP ? activeButtonStyle : buttonStyle}
              onClick={togglePiP}
              title="Picture-in-Picture"
            >
              <PictureInPicture2 style={{ width: 20, height: 20 }} />
            </button>

            <button
              style={isStretched ? activeButtonStyle : buttonStyle}
              onClick={toggleStretch}
              title={isStretched ? 'Ajustar à tela' : 'Preencher tela'}
            >
              {isStretched ? (
                <Square style={{ width: 20, height: 20 }} />
              ) : (
                <RectangleHorizontal style={{ width: 20, height: 20 }} />
              )}
            </button>

            <button
              style={buttonStyle}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <Minimize style={{ width: 20, height: 20 }} />
              ) : (
                <Maximize style={{ width: 20, height: 20 }} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
