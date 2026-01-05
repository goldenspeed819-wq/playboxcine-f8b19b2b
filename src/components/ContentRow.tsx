import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, Series } from '@/types/database';
import { ContentCard } from './ContentCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContentRowProps {
  title: string;
  items: (Movie | Series)[];
  type: 'movie' | 'series' | 'mixed';
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

  const resolveItemType = (item: Movie | Series): 'movie' | 'series' => {
    // Movies have video_url/cover fields; Series doesn't.
    return 'video_url' in item ? 'movie' : 'series';
  };

  if (items.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-4">
            <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{title}</span>
          </h2>
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
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
