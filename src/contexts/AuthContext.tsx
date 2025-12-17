import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_code: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  profile_completed: boolean | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileAndRole = async (sessionUser: User) => {
    const userId = sessionUser.id;
    const email = sessionUser.email ?? '';

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
        }
      } catch (err) {
        console.error('Auth hydrate failed:', err);
        // Failsafe: avoid freezing the UI in loading state
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

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      isAdmin, 
      isLoading,
      signUp, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
