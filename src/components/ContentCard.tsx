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
        'group relative block rounded-xl overflow-hidden opacity-0 animate-slide-up',
        'transition-all duration-500 hover:scale-[1.04] hover:z-10',
        `stagger-${Math.min(index % 5 + 1, 5)}`
      )}
      style={{ animationFillMode: 'forwards' }}
    >
      <div className="aspect-[2/3] bg-card overflow-hidden relative">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-card to-card flex items-center justify-center">
            {type === 'movie' ? (
              <Film className="w-8 h-8 sm:w-12 sm:h-12 text-primary/30" />
            ) : (
              <Tv className="w-8 h-8 sm:w-12 sm:h-12 text-primary/30" />
            )}
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />
        
        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
             style={{ boxShadow: 'inset 0 0 60px hsl(38 95% 55% / 0.1)' }} />
        
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary flex items-center justify-center shadow-lg scale-75 group-hover:scale-100 transition-transform duration-300"
               style={{ boxShadow: 'var(--shadow-gold)' }}>
            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <span className={cn(
            "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm",
            type === 'movie' 
              ? "bg-primary/90 text-primary-foreground" 
              : "bg-violet-500/80 text-white"
          )}>
            {type === 'movie' ? 'Filme' : 'Série'}
          </span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="font-heading font-semibold text-xs sm:text-sm line-clamp-2 text-white mb-1.5 group-hover:text-primary transition-colors duration-300">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/60">
            {item.release_year && (
              <span className="font-medium">{item.release_year}</span>
            )}
            {item.rating && (
              <span className="flex items-center gap-0.5 bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                <Star className="w-2.5 h-2.5 text-primary" fill="currentColor" />
                {item.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}