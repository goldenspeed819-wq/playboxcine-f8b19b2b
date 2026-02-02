import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FollowSeriesButtonProps {
  seriesId: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
  className?: string;
}

export function FollowSeriesButton({
  seriesId,
  size = 'default',
  variant = 'ghost',
  showLabel = false,
  className,
}: FollowSeriesButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && seriesId) {
      checkFollowing();
    }
  }, [user, seriesId]);

  const checkFollowing = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('followed_series')
      .select('id')
      .eq('user_id', user.id)
      .eq('series_id', seriesId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para seguir séries.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('followed_series')
          .delete()
          .eq('user_id', user.id)
          .eq('series_id', seriesId);

        if (error) throw error;

        setIsFollowing(false);
        toast({
          title: 'Notificações desativadas',
          description: 'Você não receberá mais notificações desta série.',
        });
      } else {
        const { error } = await supabase.from('followed_series').insert({
          user_id: user.id,
          series_id: seriesId,
        });

        if (error) throw error;

        setIsFollowing(true);
        toast({
          title: 'Notificações ativadas',
          description: 'Você será notificado quando novos episódios forem adicionados.',
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const Icon = isFollowing ? Bell : BellOff;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleFollow}
      disabled={isLoading}
      className={cn(
        'transition-all',
        isFollowing && 'text-yellow-500 hover:text-yellow-400',
        className
      )}
    >
      <Icon className={cn(iconSize, isFollowing && 'fill-current')} />
      {showLabel && (
        <span className="ml-2">
          {isFollowing ? 'Notificando' : 'Notificar'}
        </span>
      )}
    </Button>
  );
}
