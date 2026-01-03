import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Clock, MessageSquare, Ban, ShieldAlert } from 'lucide-react';
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
    isPermanent: boolean;
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
          reason: data.reason || 'Violação dos termos de uso',
          isPermanent: data.is_permanent || false,
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
        window.location.reload();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [banInfo?.expiresAt]);

  if (!banInfo?.isBanned) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gradient-to-br from-black via-background to-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 35px,
            rgba(255,255,255,.05) 35px,
            rgba(255,255,255,.05) 70px
          )`
        }} />
      </div>

      <div className="w-full max-w-lg text-center relative z-10">
        {/* Icon Container */}
        <div className="relative mb-8">
          <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center border border-destructive/30 shadow-2xl shadow-destructive/20">
            <ShieldAlert className="w-14 h-14 text-destructive" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive flex items-center justify-center animate-bounce">
            <Ban className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">
          Acesso Bloqueado
        </h1>
        <p className="text-xl text-destructive font-semibold mb-6">
          Sua conta foi suspensa
        </p>

        {/* Reason Card */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold">Motivo da Suspensão</span>
          </div>
          <p className="text-foreground text-lg">
            {banInfo.reason}
          </p>
        </div>

        {/* Timer */}
        {banInfo.expiresAt && !banInfo.isPermanent && (
          <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-semibold">Tempo Restante de Suspensão</span>
            </div>
            <div className="text-5xl font-display font-bold text-primary tracking-wider font-mono">
              {timeLeft}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Sua conta será desbloqueada automaticamente após este período
            </p>
          </div>
        )}

        {/* Permanent Ban */}
        {banInfo.isPermanent && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Ban className="w-6 h-6 text-destructive" />
              <p className="text-destructive font-bold text-xl">
                Suspensão Permanente
              </p>
            </div>
            <p className="text-muted-foreground">
              Esta conta foi suspensa permanentemente e não pode mais acessar a plataforma.
            </p>
          </div>
        )}

        {/* Support */}
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Se você acredita que isso é um erro, entre em contato com o suporte
          </p>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="gap-2 border-primary/30 hover:bg-primary/10"
          >
            <a href="https://discord.gg/hMKWsxAUgJ" target="_blank" rel="noopener noreferrer">
              <MessageSquare className="w-5 h-5" />
              Entrar no Discord
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
