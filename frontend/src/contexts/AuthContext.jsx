import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password, captchaToken) => {
    if (!supabase) return { error: { message: 'Supabase is not configured. Check your environment variables.' } };
    return supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
  };

  const signUp = (email, password, captchaToken) => {
    if (!supabase) return { error: { message: 'Supabase is not configured. Check your environment variables.' } };
    return supabase.auth.signUp({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
  };

  const signUp = (email, password) => {
    if (!supabase) return { error: { message: 'Supabase is not configured. Check your environment variables.' } };
    return supabase.auth.signUp({ email, password });
  };

  const signOut = () => {
    if (!supabase) return;
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
