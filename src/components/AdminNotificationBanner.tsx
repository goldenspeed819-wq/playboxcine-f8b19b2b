import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface AdminNotificationBannerProps {
  userId: string | undefined;
}

export function AdminNotificationBanner({ userId }: AdminNotificationBannerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      // Get active notifications
      const { data: notifs, error: notifsError } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notifsError || !notifs) return;

      // Get dismissed notifications for this user
      const { data: dismissed } = await supabase
        .from('dismissed_notifications')
        .select('notification_id')
        .eq('user_id', userId);

      const dismissedIds = new Set(dismissed?.map(d => d.notification_id) || []);

      // Filter out dismissed notifications
      const activeNotifs = notifs.filter(n => !dismissedIds.has(n.id));
      setNotifications(activeNotifs);
    };

    fetchNotifications();
  }, [userId]);

  const handleDismiss = async () => {
    if (!userId || notifications.length === 0) return;

    const currentNotif = notifications[currentIndex];
    
    // Mark as dismissed
    await supabase
      .from('dismissed_notifications')
      .insert({
        user_id: userId,
        notification_id: currentNotif.id,
      });

    // Remove from local state
    const newNotifs = notifications.filter((_, i) => i !== currentIndex);
    setNotifications(newNotifs);
    setCurrentIndex(0);
  };

  if (notifications.length === 0) return null;

  const currentNotif = notifications[currentIndex];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-primary/95 backdrop-blur-md text-primary-foreground rounded-xl shadow-2xl shadow-primary/25 border border-primary-foreground/10 overflow-hidden animate-fade-in">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-bold text-lg mb-1">{currentNotif.title}</h4>
              <p className="text-primary-foreground/80 text-sm leading-relaxed">
                {currentNotif.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {notifications.length > 1 && (
            <div className="flex justify-center gap-1 mt-3">
              {notifications.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
