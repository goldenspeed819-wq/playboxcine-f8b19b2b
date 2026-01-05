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
        'group relative block rounded-2xl overflow-hidden opacity-0 animate-slide-up',
        'transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20',
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
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center">
            {type === 'movie' ? (
              <Film className="w-12 h-12 text-primary/40" />
            ) : (
              <Tv className="w-12 h-12 text-primary/40" />
            )}
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-primary/40 scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Category Badge */}
        {item.category && (
          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
              {item.category}
            </span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-3 right-3">
          <span className={cn(
            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            type === 'movie' 
              ? "bg-primary/80 text-primary-foreground" 
              : "bg-violet-500/80 text-white"
          )}>
            {type === 'movie' ? 'Filme' : 'Série'}
          </span>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display font-bold text-sm md:text-base line-clamp-2 text-white drop-shadow-lg mb-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-white/70">
            {item.release_year && (
              <span className="font-medium">{item.release_year}</span>
            )}
            {item.rating && (
              <span className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                {item.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
