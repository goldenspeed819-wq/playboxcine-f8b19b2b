import { Link } from 'react-router-dom';
import { Play, Star, Film, Tv } from 'lucide-react';
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
        'group relative block rounded-xl sm:rounded-2xl overflow-hidden opacity-0 animate-slide-up',
        'transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 active:scale-[0.98]',
        `stagger-${Math.min(index % 5 + 1, 5)}`
      )}
      style={{ animationFillMode: 'forwards' }}
    >
      {/* Thumbnail */}
      <div className="aspect-[2/3] bg-card overflow-hidden relative">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center">
            {type === 'movie' ? (
              <Film className="w-8 h-8 sm:w-12 sm:h-12 text-primary/40" />
            ) : (
              <Tv className="w-8 h-8 sm:w-12 sm:h-12 text-primary/40" />
            )}
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 sm:opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
        
        {/* Play Button - Always visible on mobile */}
        <div className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-primary/40 scale-90 sm:scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Category Badge - Hidden on mobile */}
        {item.category && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider">
              {item.category}
            </span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <span className={cn(
            "px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider",
            type === 'movie' 
              ? "bg-primary/80 text-primary-foreground" 
              : "bg-violet-500/80 text-white"
          )}>
            {type === 'movie' ? 'Filme' : 'Série'}
          </span>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4">
          <h3 className="font-display font-bold text-xs sm:text-sm md:text-base line-clamp-2 text-white drop-shadow-lg mb-1 sm:mb-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-white/70">
            {item.release_year && (
              <span className="font-medium">{item.release_year}</span>
            )}
            {item.rating && (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-white/10 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 rounded-full">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400" fill="currentColor" />
                {item.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
