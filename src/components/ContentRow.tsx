import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, Series } from '@/types/database';
import { ContentCard } from './ContentCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTVMode } from '@/contexts/TVModeContext';

interface ContentRowProps {
  title: string;
  items: (Movie | Series)[];
  type: 'movie' | 'series' | 'mixed';
  rowIndex?: number;
  isRowFocused?: boolean;
  focusedItemIndex?: number;
  onItemFocus?: (index: number) => void;
}

export function ContentRow({ 
  title, 
  items, 
  type, 
  rowIndex = 0,
  isRowFocused = false,
  focusedItemIndex = 0,
  onItemFocus
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isTVMode } = useTVMode();

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Auto-scroll to focused item in TV mode
  useEffect(() => {
    if (isTVMode && isRowFocused && scrollRef.current) {
      const itemWidth = 220; // approximate width including gap
      const scrollPosition = focusedItemIndex * itemWidth - 100;
      scrollRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    }
  }, [isTVMode, isRowFocused, focusedItemIndex]);

  const resolveItemType = (item: Movie | Series): 'movie' | 'series' => {
    return 'video_url' in item ? 'movie' : 'series';
  };

  if (items.length === 0) return null;

  return (
    <section className={cn(
      "py-10 transition-all duration-300",
      isTVMode && isRowFocused && "bg-primary/5 rounded-xl"
    )}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className={cn(
            "font-display text-2xl md:text-3xl font-bold flex items-center gap-4 transition-colors",
            isTVMode && isRowFocused && "text-primary"
          )}>
            <span className={cn(
              "w-1.5 h-8 rounded-full transition-all",
              isTVMode && isRowFocused 
                ? "bg-primary w-2" 
                : "bg-gradient-to-b from-primary to-primary/50"
            )} />
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{title}</span>
          </h2>
          {!isTVMode && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-full border-border/50 bg-secondary/30 hover:border-primary hover:bg-primary/10 hover:text-primary transition-all"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-full border-border/50 bg-secondary/30 hover:border-primary hover:bg-primary/10 hover:text-primary transition-all"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-6 -mx-4 px-4 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <div key={item.id} className="flex-shrink-0 w-44 md:w-52">
              <ContentCard
                item={item}
                type={type === 'mixed' ? resolveItemType(item) : type}
                index={index}
                isTVFocused={isTVMode && isRowFocused && focusedItemIndex === index}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

