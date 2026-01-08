import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Tv, Maximize, Minimize, List, X, Zap, Cast, Menu, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface LiveChannel {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  iframe_url: string;
  category: string | null;
  is_featured: boolean | null;
  is_live: boolean | null;
}

const LiveChannels = () => {
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showChannelList, setShowChannelList] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase
        .from('live_channels')
        .select('*')
        .eq('is_live', true)
        .order('title', { ascending: true });

      if (data) {
        setChannels(data);
        const featured = data.find(c => c.is_featured);
        if (featured) {
          setSelectedChannel(featured);
          setCurrentIndex(data.indexOf(featured));
        }
      }
      setIsLoading(false);
    };

    fetchChannels();
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (selectedChannel) {
        setShowControls(false);
      }
    }, 3000);
  }, [selectedChannel]);

  useEffect(() => {
    if (selectedChannel) {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [selectedChannel, resetControlsTimeout]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && playerContainerRef.current) {
        await playerContainerRef.current.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Picture-in-Picture for supported browsers
  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        // PiP for iframes is complex, we create a video element as fallback message
        setIsPiPActive(!isPiPActive);
        // Show toast about PiP limitation with iframes
        const event = new CustomEvent('toast', { 
          detail: { 
            title: 'Transmissão', 
            description: 'O PiP pode não funcionar com todos os players. Tente usar tela cheia.' 
          } 
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  const getIframeSrc = (iframeUrl: string) => {
    const srcMatch = iframeUrl.match(/src=["']([^"']+)["']/);
    return srcMatch ? srcMatch[1] : iframeUrl;
  };

  const changeChannel = useCallback((direction: 'next' | 'prev') => {
    if (channels.length === 0) return;
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % channels.length;
    } else {
      newIndex = currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
    }
    
    setCurrentIndex(newIndex);
    setSelectedChannel(channels[newIndex]);
    resetControlsTimeout();
  }, [channels, currentIndex, resetControlsTimeout]);

  const selectChannel = (channel: LiveChannel, index: number) => {
    setSelectedChannel(channel);
    setCurrentIndex(index);
    setShowChannelList(false);
  };

  // Handle scroll for channel change (PC)
  useEffect(() => {
    if (!selectedChannel) return;

    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        if (e.deltaY > 0) {
          changeChannel('next');
        } else {
          changeChannel('prev');
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [selectedChannel, changeChannel]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!selectedChannel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          changeChannel('prev');
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          changeChannel('next');
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            setSelectedChannel(null);
          }
          break;
        case 'l':
        case 'L':
          setShowChannelList(prev => !prev);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChannel, changeChannel, isFullscreen]);

  // Group channels by category
  const groupedChannels = channels.reduce((acc, channel) => {
    const category = channel.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(channel);
    return acc;
  }, {} as Record<string, LiveChannel[]>);

  const getAdjacentChannels = () => {
    if (channels.length < 2) return { prev: null, next: null };
    const prevIndex = currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
    const nextIndex = (currentIndex + 1) % channels.length;
    return { prev: channels[prevIndex], next: channels[nextIndex] };
  };

  const { prev: prevChannel, next: nextChannel } = getAdjacentChannels();

  // Player View
  if (selectedChannel) {
    return (
      <div 
        ref={containerRef} 
        className="min-h-screen bg-black relative overflow-hidden"
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
      >
        {/* Main Player Container */}
        <div ref={playerContainerRef} className="w-full h-screen relative">
          <iframe
            ref={iframeRef}
            src={getIframeSrc(selectedChannel.iframe_url)}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Mobile Controls Overlay - Always accessible with tap */}
          <div 
            className={cn(
              "absolute inset-0 transition-opacity duration-300 pointer-events-none",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 md:p-4 pointer-events-auto">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedChannel(null)}
                  className="text-white hover:bg-white/20 gap-1 md:gap-2 h-9 px-2 md:px-3"
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
                
                <div className="flex items-center gap-2 md:gap-4 flex-1 justify-center px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-bold text-xs md:text-sm">AO VIVO</span>
                  </div>
                  <div className="text-white text-center">
                    <span className="font-semibold text-sm md:text-base truncate max-w-[120px] md:max-w-none inline-block">
                      {selectedChannel.title}
                    </span>
                    {selectedChannel.category && (
                      <span className="text-white/60 ml-1 md:ml-2 text-xs md:text-sm hidden sm:inline">
                        • {selectedChannel.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChannelList(!showChannelList)}
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    <List className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Controls - Mobile Optimized */}
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 md:p-4 pointer-events-auto">
              <div className="flex items-center justify-between gap-2">
                {/* Channel Navigation - Mobile */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => changeChannel('prev')}
                    className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  
                  <div className="text-center text-white text-xs font-mono px-2">
                    {currentIndex + 1}/{channels.length}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => changeChannel('next')}
                    className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                {/* Channel Info - Mobile */}
                <div className="flex-1 text-center px-2">
                  <p className="text-white text-xs md:text-sm truncate">
                    {selectedChannel.title}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* PiP Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePiP}
                    className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                    title="Transmitir / Picture-in-Picture"
                  >
                    <Cast className="w-5 h-5" />
                  </Button>

                  {/* Fullscreen Button - Priority on Mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10"
                    title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5 md:w-6 md:h-6" />
                    ) : (
                      <Maximize className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Keyboard shortcuts - Desktop only */}
              <div className="hidden md:flex items-center justify-center gap-4 mt-3 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</span>
                  Mudar canal
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-white/10 rounded">L</span>
                  Lista
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-white/10 rounded">F</span>
                  Tela cheia
                </span>
              </div>
            </div>

            {/* Side Channel Navigation - Desktop Only */}
            <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col gap-2 pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeChannel('prev')}
                className="w-12 h-12 rounded-full bg-black/50 text-white hover:bg-white/20 border border-white/20"
              >
                <ChevronUp className="w-6 h-6" />
              </Button>
              
              <div className="text-center text-white text-xs font-mono py-1">
                {currentIndex + 1}/{channels.length}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeChannel('next')}
                className="w-12 h-12 rounded-full bg-black/50 text-white hover:bg-white/20 border border-white/20"
              >
                <ChevronDown className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Channel List Sidebar */}
        {showChannelList && (
          <>
            {/* Backdrop for mobile */}
            <div 
              className="fixed inset-0 bg-black/50 z-[55] md:hidden"
              onClick={() => setShowChannelList(false)}
            />
            
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-black/95 backdrop-blur-xl z-[60] border-l border-white/10 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5" />
                  Canais ({channels.length})
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChannelList(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {channels.map((channel, index) => (
                  <button
                    key={channel.id}
                    onClick={() => selectChannel(channel, index)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all mb-1',
                      selectedChannel?.id === channel.id
                        ? 'bg-primary/20 border border-primary/50'
                        : 'hover:bg-white/10 active:bg-white/20'
                    )}
                  >
                    <div className="w-14 h-9 md:w-16 md:h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0 relative">
                      {channel.thumbnail ? (
                        <img
                          src={channel.thumbnail}
                          alt={channel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/20 to-primary/20">
                          <Tv className="w-4 h-4 text-white/50" />
                        </div>
                      )}
                      {selectedChannel?.id === channel.id && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <Radio className="w-3 h-3 text-white animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-semibold text-sm truncate',
                        selectedChannel?.id === channel.id ? 'text-primary' : 'text-white'
                      )}>
                        {channel.title}
                      </p>
                      <p className="text-xs text-white/50 truncate">
                        {channel.category || 'Geral'}
                      </p>
                    </div>
                    <span className="text-xs text-white/40 font-mono">{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Channel List View
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 md:pt-24 pb-16">
        <div className="container mx-auto px-3 md:px-4">
          {/* Hero Section - Mobile Optimized */}
          <div className="mb-6 md:mb-10">
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-red-600/20 via-primary/10 to-background border border-border/50 p-5 md:p-8 lg:p-12">
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.3),_transparent_70%)]" />
              </div>
              
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-600 flex items-center justify-center">
                    <Radio className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-semibold text-xs md:text-sm">AO VIVO</span>
                  </div>
                </div>
                
                <h1 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4">
                  Canais ao Vivo
                </h1>
                
                <p className="text-muted-foreground text-sm md:text-lg mb-4 md:mb-6">
                  Assista transmissões ao vivo. Toque para assistir em tela cheia.
                </p>
                
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-secondary/50 rounded-lg text-xs md:text-sm">
                    <Tv className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                    {channels.length} canais
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-secondary/50 rounded-lg text-xs md:text-sm">
                    <Maximize className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                    Tela cheia
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 md:py-20">
              <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-b-2 border-primary"></div>
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-16 md:py-20">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-muted flex items-center justify-center">
                <Tv className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Nenhum canal disponível</h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Não há canais ao vivo no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-8 md:space-y-10">
              {/* Featured Channels */}
              {channels.some(c => c.is_featured) && (
                <section>
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                    <div className="w-1 h-5 md:h-6 bg-yellow-500 rounded-full" />
                    <h2 className="font-display text-xl md:text-2xl font-bold">Em Destaque</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {channels.filter(c => c.is_featured).map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => selectChannel(channel, channels.indexOf(channel))}
                        className="group text-left rounded-xl md:rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
                      >
                        <div className="relative aspect-video">
                          {channel.thumbnail ? (
                            <img
                              src={channel.thumbnail}
                              alt={channel.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/30 to-primary/20">
                              <Radio className="w-12 h-12 md:w-16 md:h-16 text-red-500/50" />
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          
                          {/* Live badge */}
                          <div className="absolute top-2 md:top-3 left-2 md:left-3 px-2 md:px-3 py-1 md:py-1.5 bg-red-600 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 shadow-lg">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse" />
                            AO VIVO
                          </div>
                          
                          {/* Featured badge */}
                          <div className="absolute top-2 md:top-3 right-2 md:right-3 px-2 md:px-3 py-1 md:py-1.5 bg-yellow-500 rounded-lg text-[10px] md:text-xs font-bold text-black">
                            ★ DESTAQUE
                          </div>

                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary flex items-center justify-center shadow-xl">
                              <Radio className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground" />
                            </div>
                          </div>
                          
                          {/* Title overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                            <h3 className="font-display font-bold text-base md:text-lg text-white mb-0.5 md:mb-1">
                              {channel.title}
                            </h3>
                            {channel.description && (
                              <p className="text-white/70 text-xs md:text-sm line-clamp-2">
                                {channel.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Channels by Category */}
              {Object.entries(groupedChannels).map(([category, categoryChannels]) => (
                <section key={category}>
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                    <div className="w-1 h-5 md:h-6 bg-primary rounded-full" />
                    <h2 className="font-display text-xl md:text-2xl font-bold">{category}</h2>
                    <span className="text-muted-foreground text-xs md:text-sm">
                      {categoryChannels.length} {categoryChannels.length === 1 ? 'canal' : 'canais'}
                    </span>
                  </div>
                  
                  {/* Mobile: 2 columns, Tablet: 3-4, Desktop: 5-6 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {categoryChannels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => selectChannel(channel, channels.indexOf(channel))}
                        className="group text-left active:scale-[0.98] transition-transform"
                      >
                        <div className="relative aspect-video rounded-lg md:rounded-xl overflow-hidden bg-secondary border border-border group-hover:border-primary/50 transition-all">
                          {channel.thumbnail ? (
                            <img
                              src={channel.thumbnail}
                              alt={channel.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/20 to-primary/20">
                              <Tv className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Live badge */}
                          <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 px-1.5 md:px-2 py-0.5 md:py-1 bg-red-600 rounded-md text-[8px] md:text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full animate-pulse" />
                            LIVE
                          </div>

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center">
                              <Radio className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="mt-1.5 md:mt-2 font-semibold text-xs md:text-sm truncate group-hover:text-primary transition-colors">
                          {channel.title}
                        </h3>
                        {channel.description && (
                          <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                            {channel.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LiveChannels;
