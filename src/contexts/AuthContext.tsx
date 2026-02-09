import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { BanCheck } from '@/components/BanCheck';

interface Profile {
  id: string;
  user_code: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  profile_completed: boolean | null;
}

interface BanInfo {
  isBanned: boolean;
  expiresAt: Date | null;
  reason: string;
  isPermanent: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isBanned: boolean;
  signUp: (username: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);

  const checkBanStatus = async (userId: string) => {
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
      setIsBanned(true);
      return true;
    }
    
    setIsBanned(false);
    setBanInfo(null);
    return false;
  };

  const fetchProfileAndRole = async (sessionUser: User) => {
    const userId = sessionUser.id;
    const email = sessionUser.email ?? '';

    // Check if user is banned first
    await checkBanStatus(userId);

    // Profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // If profile does not exist yet, create it (prevents infinite loaders)
    let resolvedProfile = profileData ?? null;
    if (!resolvedProfile) {
      const { data: userCode, error: userCodeError } = await supabase.rpc('generate_user_code');
      if (userCodeError) {
        console.error('Error generating user code:', userCodeError);
      }

      const fallbackUserCode = `User${userId.slice(0, 4)}`;
      const resolvedUserCode = typeof userCode === 'string' ? userCode : fallbackUserCode;

      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        email,
        user_code: resolvedUserCode,
      });

      if (insertError) {
        console.error('Error creating profile:', insertError);
      } else {
        const { data: createdProfile, error: createdProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (createdProfileError) {
          console.error('Error refetching created profile:', createdProfileError);
        }

        resolvedProfile = createdProfile ?? null;
      }
    }

    setProfile(resolvedProfile);

    // Role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching role:', roleError);
    }

    setIsAdmin(!!roleData);
  };

  useEffect(() => {
    const hydrate = async (nextSession: Session | null) => {
      setIsLoading(true);

      try {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          await fetchProfileAndRole(nextSession.user);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsBanned(false);
          setBanInfo(null);
        }
      } catch (err) {
        console.error('Auth hydrate failed:', err);
        setProfile(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void hydrate(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (username: string, password: string) => {
    // Generate a fake email from username
    const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@rynexcine.app`;
    
    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
    });
    
    if (!error && data.user) {
      // Update profile with the chosen username
      await supabase
        .from('profiles')
        .update({ username })
        .eq('id', data.user.id);
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (username: string, password: string) => {
    // Look up the email by username using the secure DB function
    const { data: email, error: lookupError } = await supabase.rpc('get_auth_email_by_username', {
      _username: username,
    });

    if (lookupError || !email) {
      return { error: new Error('Usuário não encontrado.') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email as string,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsBanned(false);
    setBanInfo(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      isAdmin, 
      isLoading,
      isBanned,
      signUp, 
      signIn, 
      signOut 
    }}>
      {/* Show ban screen if user is banned */}
      {isBanned && banInfo && (
        <BanScreen banInfo={banInfo} />
      )}
      {children}
    </AuthContext.Provider>
  );
}

// Ban Screen Component
function BanScreen({ banInfo }: { banInfo: BanInfo }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string; days?: number }>({
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

  useEffect(() => {
    if (!banInfo.expiresAt || banInfo.isPermanent) return;

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
  }, [banInfo.expiresAt, banInfo.isPermanent]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gradient-to-b from-[#1a0808] via-[#0d0505] to-black">
      <div className="w-full max-w-md text-center relative">
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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

          {/* Support text */}
          <p className="text-gray-600 text-xs mt-4">
            Entre em contato com o suporte para mais informações.
          </p>
        </div>
      </div>
    </div>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}