import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  movieId?: string;
  seriesId?: string;
  size?: 'sm' | 'default' | 'lg';
  showAverage?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function RatingStars({
  movieId,
  seriesId,
  size = 'default',
  showAverage = true,
  readOnly = false,
  className,
}: RatingStarsProps) {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [movieId, seriesId, user]);

  const fetchRatings = async () => {
    // Fetch average rating
    let query = supabase.from('ratings').select('rating');

    if (movieId) {
      query = query.eq('movie_id', movieId);
    } else if (seriesId) {
      query = query.eq('series_id', seriesId);
    }

    const { data: allRatings } = await query;

    if (allRatings && allRatings.length > 0) {
      const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
      setAverageRating(sum / allRatings.length);
      setTotalRatings(allRatings.length);
    }

    // Fetch user's rating
    if (user) {
      let userQuery = supabase
        .from('ratings')
        .select('rating')
        .eq('user_id', user.id);

      if (movieId) {
        userQuery = userQuery.eq('movie_id', movieId);
      } else if (seriesId) {
        userQuery = userQuery.eq('series_id', seriesId);
      }

      const { data: userRatingData } = await userQuery.maybeSingle();
      if (userRatingData) {
        setUserRating(userRatingData.rating);
      }
    }
  };

  const handleRate = async (rating: number) => {
    if (readOnly) return;
    
    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para avaliar.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('ratings').upsert(
        {
          user_id: user.id,
          movie_id: movieId || null,
          series_id: seriesId || null,
          rating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: movieId ? 'user_id,movie_id' : 'user_id,series_id' }
      );

      if (error) throw error;

      setUserRating(rating);
      toast({
        title: 'Avaliação salva',
        description: `Você avaliou com ${rating} estrela${rating > 1 ? 's' : ''}.`,
      });

      // Refresh ratings
      fetchRatings();
    } catch (error) {
      console.error('Error rating:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar sua avaliação.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayRating = hoverRating || userRating || 0;
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => !readOnly && setHoverRating(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRate(star)}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            disabled={isLoading || readOnly}
            className={cn(
              'transition-all',
              !readOnly && 'cursor-pointer hover:scale-110',
              readOnly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                iconSize,
                'transition-colors',
                star <= displayRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : star <= averageRating && showAverage
                  ? 'fill-yellow-400/50 text-yellow-400/50'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>

      {showAverage && totalRatings > 0 && (
        <span className="text-sm text-muted-foreground">
          {averageRating.toFixed(1)} ({totalRatings})
        </span>
      )}

      {userRating > 0 && !readOnly && (
        <span className="text-xs text-primary">Sua nota: {userRating}</span>
      )}
    </div>
  );
}
