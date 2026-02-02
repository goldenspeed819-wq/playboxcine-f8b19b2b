import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  movieId?: string;
  seriesId?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
  className?: string;
}

export function FavoriteButton({
  movieId,
  seriesId,
  size = 'default',
  variant = 'ghost',
  showLabel = false,
  className,
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && (movieId || seriesId)) {
      checkFavorite();
    }
  }, [user, movieId, seriesId]);

  const checkFavorite = async () => {
    if (!user) return;

    let query = supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id);

    if (movieId) {
      query = query.eq('movie_id', movieId);
    } else if (seriesId) {
      query = query.eq('series_id', seriesId);
    }

    const { data } = await query.maybeSingle();
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para favoritar.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorite) {
        // Remove from favorites
        let query = supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id);

        if (movieId) {
          query = query.eq('movie_id', movieId);
        } else if (seriesId) {
          query = query.eq('series_id', seriesId);
        }

        const { error } = await query;
        if (error) throw error;

        setIsFavorite(false);
        toast({
          title: 'Removido dos favoritos',
          description: 'O item foi removido da sua lista.',
        });
      } else {
        // Add to favorites
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          movie_id: movieId || null,
          series_id: seriesId || null,
        });

        if (error) throw error;

        setIsFavorite(true);
        toast({
          title: 'Adicionado aos favoritos',
          description: 'O item foi adicionado à sua lista.',
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os favoritos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleFavorite}
      disabled={isLoading}
      className={cn(
        'transition-all',
        isFavorite && 'text-red-500 hover:text-red-400',
        className
      )}
    >
      <Heart
        className={cn(iconSize, isFavorite && 'fill-current')}
      />
      {showLabel && (
        <span className="ml-2">
          {isFavorite ? 'Favoritado' : 'Favoritar'}
        </span>
      )}
    </Button>
  );
}
