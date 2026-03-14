import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, Series } from '@/types/database';
import { ContentCard } from './ContentCard';
import { Button } from '@/components/ui/button';

interface ContentRowProps {
  title: string;
  items: (Movie | Series)[];
  type: 'movie' | 'series' | 'mixed';
}

export function ContentRow({ title, items, type }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  const resolveItemType = (item: Movie | Series): 'movie' | 'series' => {
    return 'video_url' in item ? 'movie' : 'series';
  };

  if (items.length === 0) return null;

  return (
    <section className="py-5 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-wide flex items-center gap-3">
            <span className="w-1 h-7 sm:h-8 bg-gradient-to-b from-primary to-primary/30 rounded-full" />
            {title.toUpperCase()}
          </h2>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="icon"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-border/40 bg-secondary/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all"
              onClick={() => scroll('left')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-border/40 bg-secondary/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all"
              onClick={() => scroll('right')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 sm:-mx-4 px-3 sm:px-4 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {items.map((item, index) => (
            <div key={item.id} className="flex-shrink-0 w-32 sm:w-44 md:w-48">
              <ContentCard item={item} type={type === 'mixed' ? resolveItemType(item) : type} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}