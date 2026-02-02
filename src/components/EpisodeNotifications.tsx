import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  episode_id: string;
  series_id: string;
  is_read: boolean;
  created_at: string;
  episode?: {
    season: number;
    episode: number;
    title?: string;
  };
  series?: {
    title: string;
    thumbnail?: string;
  };
}

export function EpisodeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('episode_notifications')
      .select(`
        id,
        episode_id,
        series_id,
        is_read,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    // Fetch episode and series details
    if (data && data.length > 0) {
      const episodeIds = data.map((n) => n.episode_id);
      const seriesIds = [...new Set(data.map((n) => n.series_id))];

      const [episodesRes, seriesRes] = await Promise.all([
        supabase.from('episodes').select('id, season, episode, title').in('id', episodeIds),
        supabase.from('series').select('id, title, thumbnail').in('id', seriesIds),
      ]);

      const episodeMap = new Map(episodesRes.data?.map((e) => [e.id, e]) || []);
      const seriesMap = new Map(seriesRes.data?.map((s) => [s.id, s]) || []);

      const enrichedNotifications = data.map((n) => ({
        ...n,
        episode: episodeMap.get(n.episode_id),
        series: seriesMap.get(n.series_id),
      }));

      setNotifications(enrichedNotifications);
    } else {
      setNotifications([]);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('episode_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('episode_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('episode_notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 hover:bg-muted/50 transition-colors relative',
                    !notification.is_read && 'bg-primary/5'
                  )}
                >
                  <Link
                    to={`/series/${notification.series_id}`}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                    className="flex gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {notification.series?.thumbnail ? (
                        <img
                          src={notification.series.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.series?.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Novo episódio: T{notification.episode?.season}E
                        {notification.episode?.episode}
                        {notification.episode?.title && ` - ${notification.episode.title}`}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 w-6 h-6"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  {!notification.is_read && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
