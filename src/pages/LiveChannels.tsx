import { useState, useEffect } from 'react';
import { Radio, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase
        .from('live_channels')
        .select('*')
        .eq('is_live', true)
        .order('title', { ascending: true });

      if (data) setChannels(data);
      setIsLoading(false);
    };

    fetchChannels();
  }, []);

  // Extract iframe src if full iframe tag is provided
  const getIframeSrc = (iframeUrl: string) => {
    const srcMatch = iframeUrl.match(/src=["']([^"']+)["']/);
    return srcMatch ? srcMatch[1] : iframeUrl;
  };

  // Group channels by category
  const groupedChannels = channels.reduce((acc, channel) => {
    const category = channel.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(channel);
    return acc;
  }, {} as Record<string, LiveChannel[]>);

  if (selectedChannel) {
    return (
      <div className="min-h-screen bg-black">
        {/* Player Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setSelectedChannel(null)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-600 rounded text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                AO VIVO
              </span>
              <span className="text-white font-semibold">{selectedChannel.title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedChannel(null)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Iframe Player */}
        <div className="w-full h-screen">
          <iframe
            src={getIframeSrc(selectedChannel.iframe_url)}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Radio className="w-8 h-8 text-red-500" />
              <h1 className="font-display text-4xl font-bold">Canais ao Vivo</h1>
            </div>
            <p className="text-muted-foreground">
              Assista transmissões ao vivo de diversos canais
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-20">
              <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhum canal disponível</h2>
              <p className="text-muted-foreground">
                Não há canais ao vivo no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedChannels).map(([category, categoryChannels]) => (
                <section key={category}>
                  <h2 className="font-display text-2xl font-bold mb-4">{category}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {categoryChannels.map(channel => (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className="group text-left"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
                          {channel.thumbnail ? (
                            <img
                              src={channel.thumbnail}
                              alt={channel.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/20 to-primary/20">
                              <Radio className="w-10 h-10 text-red-500" />
                            </div>
                          )}
                          
                          {/* Live badge */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 rounded text-xs font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            AO VIVO
                          </div>

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                              <Radio className="w-6 h-6 text-primary-foreground" />
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
