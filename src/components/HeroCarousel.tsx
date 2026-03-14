import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Movie, Series } from '@/types/database';
import { cn } from '@/lib/utils';

interface HeroCarouselProps {
  items: (Movie | Series)[];
}

export function HeroCarousel({ items }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => handleNext(), 8000);
    return () => clearInterval(interval);
  }, [items.length, currentIndex]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  if (items.length === 0) {
    return (
      <div className="relative h-[50vh] sm:h-[65vh] md:h-[80vh] flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="text-center px-4">
          <h2 className="font-display text-3xl sm:text-5xl text-muted-foreground">NENHUM DESTAQUE</h2>
          <p className="text-muted-foreground mt-3">Adicione conteúdo pelo painel admin</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const isMovie = 'duration' in currentItem || 'cover' in currentItem || 'video_url' in currentItem;
  const detailLink = isMovie ? `/movie/${currentItem.id}` : `/series/${currentItem.id}`;
  const backgroundImage = isMovie && 'cover' in currentItem && (currentItem as Movie).cover 
    ? (currentItem as Movie).cover 
    : currentItem.thumbnail;

  return (
    <div className="relative h-[50vh] sm:h-[65vh] md:h-[80vh] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt={currentItem.title}
            className={cn(
              'w-full h-full object-cover transition-all duration-700',
              isTransitioning ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
            )}
          />
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--gradient-hero)' }} />
        )}
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        {/* Subtle gold accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 h-full flex items-end sm:items-center pb-16 sm:pb-0">
        <div className={cn(
          'max-w-lg sm:max-w-xl md:max-w-2xl transition-all duration-600',
          isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
        )}>
          <span className="inline-block px-3 py-1 bg-primary/15 border border-primary/30 rounded-full text-primary text-[11px] font-semibold uppercase tracking-widest mb-3 sm:mb-4">
            {currentItem.category || (isMovie ? 'Filme' : 'Série')}
          </span>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl mb-3 sm:mb-4 leading-none tracking-wide">
            {currentItem.title.toUpperCase()}
          </h1>

          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5">
            {currentItem.release_year && <span className="font-medium">{currentItem.release_year}</span>}
            {currentItem.rating && (
              <span className="px-2 py-0.5 border border-primary/30 rounded text-primary text-[11px] font-medium">
                {currentItem.rating}
              </span>
            )}
            {'duration' in currentItem && currentItem.duration && (
              <span className="hidden sm:inline">{currentItem.duration}</span>
            )}
          </div>

          <p className="text-muted-foreground text-sm sm:text-base mb-5 sm:mb-8 line-clamp-2 sm:line-clamp-3 max-w-xl">
            {currentItem.description || 'Sem descrição disponível.'}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 h-10 sm:h-12 px-5 sm:px-8 rounded-xl font-heading font-semibold premium-glow">
              <Link to={detailLink}>
                <Play className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                Assistir Agora
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 h-10 sm:h-12 px-5 sm:px-8 rounded-xl font-heading border-foreground/20 hover:bg-foreground/5">
              <Link to={detailLink}>
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                Detalhes
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {items.length > 1 && (
        <>
          <button onClick={handlePrev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/40 backdrop-blur-md border border-border/50 flex items-center justify-center text-foreground hover:bg-primary/20 hover:border-primary/50 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleNext}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/40 backdrop-blur-md border border-border/50 flex items-center justify-center text-foreground hover:bg-primary/20 hover:border-primary/50 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-1 rounded-full transition-all duration-500',
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-foreground/20 hover:bg-foreground/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}