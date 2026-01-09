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
    
    const interval = setInterval(() => {
      handleNext();
    }, 8000);
    return () => clearInterval(interval);
  }, [items.length, currentIndex]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  if (items.length === 0) {
    return (
      <div className="relative h-[60vh] sm:h-[70vh] md:h-[85vh] flex items-center justify-center bg-hero-gradient">
        <div className="text-center px-4">
          <h2 className="font-display text-xl sm:text-2xl md:text-4xl text-muted-foreground">
            Nenhum conteúdo em destaque
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Adicione conteúdo pelo painel admin</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  
  // Determine if current item is a movie by checking for movie-specific properties
  const isMovie = 'duration' in currentItem || 'cover' in currentItem || 'video_url' in currentItem;
  const detailLink = isMovie ? `/movie/${currentItem.id}` : `/series/${currentItem.id}`;

  // Use cover if available for movies, otherwise fallback to thumbnail
  const backgroundImage = isMovie && 'cover' in currentItem && (currentItem as Movie).cover 
    ? (currentItem as Movie).cover 
    : currentItem.thumbnail;

  return (
    <div className="relative h-[60vh] sm:h-[70vh] md:h-[85vh] overflow-hidden">
      {/* Background Image */}
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
          <div className="w-full h-full bg-hero-gradient" />
        )}
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 h-full flex items-end sm:items-center pb-20 sm:pb-0">
        <div className={cn(
          'max-w-lg sm:max-w-xl md:max-w-2xl transition-all duration-500',
          isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
        )}>
          {/* Category Badge */}
          <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/20 border border-primary/50 rounded-full text-primary text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-4">
            {currentItem.category || (isMovie ? 'Filme' : 'Série')}
          </span>

          {/* Title */}
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 sm:mb-4 leading-tight line-clamp-2">
            {currentItem.title}
          </h1>

          {/* Meta Info */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4">
            {currentItem.release_year && <span>{currentItem.release_year}</span>}
            {currentItem.rating && (
              <span className="px-1.5 sm:px-2 py-0.5 border border-muted-foreground/50 rounded text-[10px] sm:text-xs">
                {currentItem.rating}
              </span>
            )}
            {'duration' in currentItem && currentItem.duration && (
              <span className="hidden sm:inline">{currentItem.duration}</span>
            )}
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 line-clamp-2 sm:line-clamp-3">
            {currentItem.description || 'Sem descrição disponível.'}
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Button asChild size="sm" className="gap-2 neon-glow text-sm sm:text-base h-9 sm:h-11 px-4 sm:px-6">
              <Link to={detailLink}>
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Assistir</span>
                <span className="xs:hidden">Play</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 border-foreground/30 hover:bg-foreground/10 text-sm sm:text-base h-9 sm:h-11 px-4 sm:px-6">
              <Link to={detailLink}>
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Mais Informações</span>
                <span className="sm:hidden">Info</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-background/50 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-primary/20 hover:border-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-background/50 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-primary/20 hover:border-primary transition-colors"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-1.5 sm:h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-6 sm:w-8 bg-primary'
                  : 'w-1.5 sm:w-2 bg-foreground/30 hover:bg-foreground/50'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
