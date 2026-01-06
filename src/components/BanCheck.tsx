import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, MessageCircle } from 'lucide-react';
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
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string; days?: number }>({
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

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
        setTimeLeft({ hours: '00', minutes: '00', seconds: '00' });
        window.location.reload();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days: days > 0 ? days : undefined,
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0')
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [banInfo?.expiresAt]);

  if (!banInfo?.isBanned) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gradient-to-b from-[#1a0808] via-[#0d0505] to-black">
      {/* Main Card */}
      <div className="w-full max-w-md text-center relative">
        {/* Card Container with red glow border */}
        <div className="relative bg-gradient-to-b from-[#1a0a0a] to-[#0d0505] rounded-2xl border border-red-900/50 p-8 shadow-[0_0_60px_rgba(220,38,38,0.15)]">
          
          {/* Prohibition Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 80 80" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]"
              >
                <circle cx="40" cy="40" r="35" stroke="url(#redGradient)" strokeWidth="6" fill="none"/>
                <line x1="18" y1="18" x2="62" y2="62" stroke="url(#redGradient)" strokeWidth="6" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="80" y2="80">
                    <stop offset="0%" stopColor="#ef4444"/>
                    <stop offset="100%" stopColor="#dc2626"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent mb-2">
            {banInfo.isPermanent ? 'Conta Permanentemente Bloqueada' : 'Acesso Temporariamente Bloqueado'}
          </h1>

          {/* Reason */}
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            {banInfo.reason}
          </p>

          {/* Timer Box - Only show for temporary bans */}
          {!banInfo.isPermanent && banInfo.expiresAt && (
            <div className="bg-[#0a0505] border border-red-900/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-4">
                <Clock className="w-4 h-4" />
                <span>Tempo restante de bloqueio</span>
              </div>
              
              <div className="flex items-center justify-center gap-1">
                {timeLeft.days && timeLeft.days > 0 && (
                  <>
                    <span className="text-5xl font-bold text-red-500 font-mono tracking-wider">
                      {timeLeft.days}d
                    </span>
                    <span className="text-4xl font-bold text-red-500/60 mx-1">:</span>
                  </>
                )}
                <span className="text-5xl font-bold text-red-500 font-mono tracking-wider">
                  {timeLeft.hours}
                </span>
                <span className="text-4xl font-bold text-red-500/60 mx-1">:</span>
                <span className="text-5xl font-bold text-red-500 font-mono tracking-wider">
                  {timeLeft.minutes}
                </span>
                <span className="text-4xl font-bold text-red-500/60 mx-1">:</span>
                <span className="text-5xl font-bold text-red-500 font-mono tracking-wider">
                  {timeLeft.seconds}
                </span>
              </div>
            </div>
          )}

          {/* Permanent Ban Message */}
          {banInfo.isPermanent && (
            <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="font-semibold">Suspensão Permanente</span>
              </div>
              <p className="text-gray-500 text-sm">
                Esta conta foi suspensa permanentemente e não pode mais acessar a plataforma.
              </p>
            </div>
          )}

          {/* Discord Button */}
          <Button
            asChild
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-5 rounded-xl gap-2 transition-all"
          >
            <a href="https://discord.gg/hMKWsxAUgJ" target="_blank" rel="noopener noreferrer">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Entrar no Discord
            </a>
          </Button>

          {/* Support text */}
          <p className="text-gray-600 text-xs mt-4">
            Nosso suporte está disponível no Discord para ajudá-lo.
          </p>
        </div>
      </div>
    </div>
  );
};
