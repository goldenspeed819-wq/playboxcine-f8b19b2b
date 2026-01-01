import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BanCheckProps {
  userId: string | undefined;
  onBanned: () => void;
}

export const BanCheck = ({ userId, onBanned }: BanCheckProps) => {
  const [banInfo, setBanInfo] = useState<{
    isBanned: boolean;
    expiresAt: Date | null;
    reason: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!userId) return;

    const checkBan = async () => {
      const { data, error } = await supabase
        .from('banned_users')
        .select('expires_at, reason, is_permanent')
        .eq('user_id', userId)
        .or('is_permanent.eq.true,expires_at.gt.now()')
        .maybeSingle();

      if (data && !error) {
        setBanInfo({
          isBanned: true,
          expiresAt: data.expires_at ? new Date(data.expires_at) : null,
          reason: data.reason || 'Violação dos termos de uso'
        });
        onBanned();
      }
    };

    checkBan();
  }, [userId, onBanned]);

  useEffect(() => {
    if (!banInfo?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = banInfo.expiresAt!.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expirado');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [banInfo?.expiresAt]);

  if (!banInfo?.isBanned) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-display font-bold text-destructive mb-4">
          Conta Suspensa
        </h1>

        {/* Reason */}
        <p className="text-muted-foreground text-lg mb-6">
          {banInfo.reason}
        </p>

        {/* Timer */}
        {banInfo.expiresAt && (
          <div className="bg-card/50 border border-border/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-5 h-5" />
              <span>Tempo restante de suspensão</span>
            </div>
            <div className="text-5xl font-display font-bold text-foreground tracking-wider">
              {timeLeft}
            </div>
          </div>
        )}

        {!banInfo.expiresAt && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 mb-6">
            <p className="text-destructive font-semibold">
              Suspensão Permanente
            </p>
          </div>
        )}

        {/* Support */}
        <p className="text-muted-foreground mb-4">
          Se você acredita que isso é um erro, entre em contato com o suporte
        </p>

        <Button
          asChild
          variant="outline"
          className="gap-2 border-primary/30 hover:bg-primary/10"
        >
          <a href="https://discord.gg/hMKWsxAUgJ" target="_blank" rel="noopener noreferrer">
            <MessageSquare className="w-4 h-4" />
            Entrar no Discord
          </a>
        </Button>
      </div>
    </div>
  );
};
