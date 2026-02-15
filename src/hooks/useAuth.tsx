import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

const PRODUCTION_HOST = 'someday-savings-tool.lovable.app';

function isPreviewEnvironment(): boolean {
  const host = window.location.hostname;
  if (host === PRODUCTION_HOST) return false;
  return host.endsWith('.lovable.app') || host === 'localhost' || host === '127.0.0.1';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  autoLoginInProgress: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoLoginInProgress, setAutoLoginInProgress] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
        return;
      }

      // No session — attempt preview auto-login
      if (isPreviewEnvironment()) {
        setAutoLoginInProgress(true);
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const res = await fetch(`${supabaseUrl}/functions/v1/preview-auto-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (res.ok) {
            const { access_token, refresh_token } = await res.json();
            await supabase.auth.setSession({ access_token, refresh_token });
            // onAuthStateChange will update state
          } else {
            console.warn('Preview auto-login failed:', await res.text());
          }
        } catch (err) {
          console.warn('Preview auto-login error:', err);
        } finally {
          setAutoLoginInProgress(false);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    
    return { error: error ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, autoLoginInProgress, signUp, signIn, signInWithGoogle, signOut }}>
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
