import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { DEFAULT_LANG, SUPPORTED_LANGS } from '@/i18n';

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

    // Apply user's preferred language from metadata
    const applyUserLanguage = (u) => {
      if (!u) return;
      const lang = u.user_metadata?.preferred_language;
      if (lang && SUPPORTED_LANGS.includes(lang)) {
        const stored = localStorage.getItem('i18nextLng');
        // Only override if localStorage doesn't already match a supported lang
        // (i.e. user hasn't manually switched language in this browser)
        if (!stored || !SUPPORTED_LANGS.includes(stored)) {
          localStorage.setItem('i18nextLng', lang);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      applyUserLanguage(s?.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        // Apply language on sign-in or email confirmation
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          applyUserLanguage(s?.user);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // Verify Turnstile token via our backend (bypasses in debug mode for localhost)
  const verifyTurnstile = async (token) => {
    if (!token) return false;
    try {
      const { data } = await axios.post('/api/auth/verify-turnstile', { token });
      return data.success === true;
    } catch {
      return false;
    }
  };

  const signIn = async (email, password, captchaToken) => {
    if (!supabase) return { error: { message: 'Supabase is not configured. Check your environment variables.' } };
    // Verify CAPTCHA via backend (not Supabase) — backend handles localhost bypass
    const ok = await verifyTurnstile(captchaToken);
    if (!ok) return { error: { message: 'CAPTCHA verification failed' } };
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email, password, captchaToken, language) => {
    if (!supabase) return { error: { message: 'Supabase is not configured. Check your environment variables.' } };
    const lang = language || DEFAULT_LANG;
    // Verify CAPTCHA via backend (not Supabase) — backend handles localhost bypass
    const ok = await verifyTurnstile(captchaToken);
    if (!ok) return { error: { message: 'CAPTCHA verification failed' } };
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${lang}/dashboard`,
        data: { preferred_language: lang },
      },
    });
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
