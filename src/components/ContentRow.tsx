import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, Series } from '@/types/database';
import { ContentCard } from './ContentCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContentRowProps {
  title: string;
  items: (Movie | Series)[];
  type: 'movie' | 'series';
}

export function ContentRow({ title, items, type }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl md:text-2xl font-bold flex items-center gap-3">
            <span className="w-1 h-6 bg-primary rounded-full" />
            {title}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-full border-border hover:border-primary hover:bg-primary/10"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-full border-border hover:border-primary hover:bg-primary/10"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <div key={item.id} className="flex-shrink-0 w-40 md:w-48">
              <ContentCard item={item} type={type} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
