import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTurnstile } from '@/hooks/useTurnstile';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';
import useLocalizedPath from '@/hooks/useLocalizedPath';
import SEOHead from '@/components/SEOHead';

export default function Login() {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const { t } = useTranslation('auth');
  const lp = useLocalizedPath();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { containerRef, token, reset } = useTurnstile();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('securityCheck'));
      return;
    }

    setLoading(true);

    const { error: authError } = await signIn(email, password, token);

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? t('login.invalidCredentials')
        : authError.message);
      reset();
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="grain-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <SEOHead pageKey="login" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-200/30 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cream-200/50 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <img src="/snapeous-logo.svg" alt="Snapeous" className="h-8 w-8" />
            <h1 className="text-2xl font-bold tracking-tight text-ink">Snapeous</h1>
          </div>
          <p className="text-sm text-ink-400">{t('login.subtitle')}</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="section-label block mb-1.5">{t('login.email')}</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder={t('login.emailPlaceholder')} autoFocus required />
            </div>

            <div>
              <label htmlFor="login-password" className="section-label block mb-1.5">{t('login.password')}</label>
              <div className="relative">
                <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pr-10" placeholder={t('login.passwordPlaceholder')} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div ref={containerRef} className="flex justify-center" />

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">{error}</div>
            )}

            <button type="submit" disabled={loading || !token} className="btn-primary w-full">
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  {t('login.submit')}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-sm text-ink-400">
          {t('login.noAccount')}{' '}
          <Link to={lp('/register')} className="font-medium text-ink hover:underline">{t('login.createAccount')}</Link>
        </p>
      </div>
    </div>
  );
}
