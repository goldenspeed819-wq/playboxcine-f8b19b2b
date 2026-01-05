import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Tv, Volume2, VolumeX, Maximize, List, X, Zap } from 'lucide-react';
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
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase
        .from('live_channels')
        .select('*')
        .eq('is_live', true)
        .order('title', { ascending: true });

      if (data) {
        setChannels(data);
        // Auto select featured channel or first one
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

  // Extract iframe src if full iframe tag is provided
  const getIframeSrc = (iframeUrl: string) => {
    const srcMatch = iframeUrl.match(/src=["']([^"']+)["']/);
    return srcMatch ? srcMatch[1] : iframeUrl;
  };

  // Change channel
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
  }, [channels, currentIndex]);

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
          setSelectedChannel(null);
          break;
        case 'l':
        case 'L':
          setShowChannelList(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChannel, changeChannel]);

  // Group channels by category
  const groupedChannels = channels.reduce((acc, channel) => {
    const category = channel.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(channel);
    return acc;
  }, {} as Record<string, LiveChannel[]>);

  // Get next and previous channels for preview
  const getAdjacentChannels = () => {
    if (channels.length < 2) return { prev: null, next: null };
    const prevIndex = currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
    const nextIndex = (currentIndex + 1) % channels.length;
    return { prev: channels[prevIndex], next: channels[nextIndex] };
  };

  const { prev: prevChannel, next: nextChannel } = getAdjacentChannels();

  if (selectedChannel) {
    return (
      <div ref={containerRef} className="min-h-screen bg-black relative overflow-hidden">
        {/* Main Player */}
        <div className="w-full h-screen">
          <iframe
            ref={iframeRef}
            src={getIframeSrc(selectedChannel.iframe_url)}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Top Controls */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setSelectedChannel(null)}
              className="text-white hover:bg-white/20 gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-bold text-sm">AO VIVO</span>
              </div>
              <div className="text-white">
                <span className="font-semibold">{selectedChannel.title}</span>
                {selectedChannel.category && (
                  <span className="text-white/60 ml-2 text-sm">• {selectedChannel.category}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChannelList(!showChannelList)}
                className="text-white hover:bg-white/20"
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Channel Navigation Controls */}
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changeChannel('prev')}
            className="w-14 h-14 rounded-full bg-black/50 text-white hover:bg-white/20 border border-white/20"
          >
            <ChevronUp className="w-8 h-8" />
          </Button>
          
          <div className="text-center text-white text-sm font-mono py-2">
            {currentIndex + 1}/{channels.length}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changeChannel('next')}
            className="w-14 h-14 rounded-full bg-black/50 text-white hover:bg-white/20 border border-white/20"
          >
            <ChevronDown className="w-8 h-8" />
          </Button>
        </div>

        {/* TV-style Channel Change Buttons (always visible on touch devices) */}
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4 md:opacity-0 md:hover:opacity-100 transition-opacity duration-300">
          {prevChannel && (
            <button
              onClick={() => changeChannel('prev')}
              className="group flex items-center gap-3 p-3 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
              <div className="hidden group-hover:block text-left">
                <p className="text-xs text-white/60">Canal Anterior</p>
                <p className="text-sm text-white font-semibold truncate max-w-[150px]">{prevChannel.title}</p>
              </div>
            </button>
          )}
          
          {nextChannel && (
            <button
              onClick={() => changeChannel('next')}
              className="group flex items-center gap-3 p-3 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-white" />
              <div className="hidden group-hover:block text-left">
                <p className="text-xs text-white/60">Próximo Canal</p>
                <p className="text-sm text-white font-semibold truncate max-w-[150px]">{nextChannel.title}</p>
              </div>
            </button>
          )}
        </div>

        {/* Channel List Sidebar */}
        {showChannelList && (
          <div className="fixed top-0 right-0 bottom-0 w-80 bg-black/95 backdrop-blur-xl z-[60] border-l border-white/10 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">Canais</h3>
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
                      : 'hover:bg-white/10'
                  )}
                >
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0 relative">
                    {channel.thumbnail ? (
                      <img
                        src={channel.thumbnail}
                        alt={channel.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/20 to-primary/20">
                        <Tv className="w-5 h-5 text-white/50" />
                      </div>
                    )}
                    {selectedChannel?.id === channel.id && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <Radio className="w-4 h-4 text-white animate-pulse" />
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
        )}

        {/* Bottom Info Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-white/60">Assistindo agora</p>
                  <p className="font-semibold">{selectedChannel.title}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span className="hidden md:flex items-center gap-2">
                  <span className="px-2 py-1 bg-white/10 rounded text-xs">↑↓</span>
                  Mudar canal
                </span>
                <span className="hidden md:flex items-center gap-2">
                  <span className="px-2 py-1 bg-white/10 rounded text-xs">L</span>
                  Lista
                </span>
                <span className="hidden md:flex items-center gap-2">
                  <span className="px-2 py-1 bg-white/10 rounded text-xs">Scroll</span>
                  Trocar
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="mb-10">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600/20 via-primary/10 to-background border border-border/50 p-8 md:p-12">
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.3),_transparent_70%)]" />
              </div>
              
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-semibold text-sm">TRANSMISSÃO AO VIVO</span>
                  </div>
                </div>
                
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                  Canais ao Vivo
                </h1>
                
                <p className="text-muted-foreground text-lg mb-6">
                  Assista transmissões ao vivo de diversos canais. Use o scroll do mouse ou as setas para trocar de canal rapidamente.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg text-sm">
                    <Tv className="w-4 h-4 text-primary" />
                    {channels.length} canais disponíveis
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg text-sm">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Troca rápida com scroll
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Tv className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhum canal disponível</h2>
              <p className="text-muted-foreground">
                Não há canais ao vivo no momento. Volte mais tarde.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Featured Channels */}
              {channels.some(c => c.is_featured) && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-yellow-500 rounded-full" />
                    <h2 className="font-display text-2xl font-bold">Em Destaque</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channels.filter(c => c.is_featured).map((channel, index) => (
                      <button
                        key={channel.id}
                        onClick={() => selectChannel(channel, channels.indexOf(channel))}
                        className="group text-left rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
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
                              <Radio className="w-16 h-16 text-red-500/50" />
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          
                          {/* Live badge */}
                          <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-600 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            AO VIVO
                          </div>
                          
                          {/* Featured badge */}
                          <div className="absolute top-3 right-3 px-3 py-1.5 bg-yellow-500 rounded-lg text-xs font-bold text-black">
                            ★ DESTAQUE
                          </div>

                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl">
                              <Radio className="w-8 h-8 text-primary-foreground" />
                            </div>
                          </div>
                          
                          {/* Title overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="font-display font-bold text-lg text-white mb-1">
                              {channel.title}
                            </h3>
                            {channel.description && (
                              <p className="text-white/70 text-sm line-clamp-2">
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
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h2 className="font-display text-2xl font-bold">{category}</h2>
                    <span className="text-muted-foreground text-sm">
                      {categoryChannels.length} {categoryChannels.length === 1 ? 'canal' : 'canais'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {categoryChannels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => selectChannel(channel, channels.indexOf(channel))}
                        className="group text-left"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary border border-border group-hover:border-primary/50 transition-all">
                          {channel.thumbnail ? (
                            <img
                              src={channel.thumbnail}
                              alt={channel.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/20 to-primary/20">
                              <Tv className="w-10 h-10 text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Live badge */}
                          <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            LIVE
                          </div>

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                              <Radio className="w-5 h-5 text-primary-foreground" />
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="mt-2 font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {channel.title}
                        </h3>
                        {channel.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
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
