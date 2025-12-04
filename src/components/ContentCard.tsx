import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { Movie, Series } from '@/types/database';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  item: Movie | Series;
  type: 'movie' | 'series';
  index?: number;
}

export function ContentCard({ item, type, index = 0 }: ContentCardProps) {
  const link = type === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;

  return (
    <Link
      to={link}
      className={cn(
        'group relative block rounded-xl overflow-hidden card-hover opacity-0 animate-slide-up',
        `stagger-${Math.min(index % 5 + 1, 5)}`
      )}
      style={{ animationFillMode: 'forwards' }}
    >
      {/* Thumbnail */}
      <div className="aspect-[2/3] bg-card overflow-hidden">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
            <span className="font-display text-4xl text-primary/50">P</span>
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-neon">
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          </div>
        </div>

        {/* Category Badge */}
        {item.category && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-xs font-semibold text-primary">
              {item.category}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="font-display font-bold text-sm md:text-base line-clamp-1 mb-1">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.release_year && <span>{item.release_year}</span>}
          {item.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-primary" />
              {item.rating}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Info (visible by default) */}
      <div className="p-3 bg-card-gradient">
        <h3 className="font-display font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {item.release_year || type === 'movie' ? 'Filme' : 'Série'}
        </p>
      </div>
    </Link>
  );
}
