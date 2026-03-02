import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTurnstile } from '@/hooks/useTurnstile';
import { verifyTurnstile } from '@/lib/api';
import useLocalizedPath from '@/hooks/useLocalizedPath';
import SEOHead from '@/components/SEOHead';

export default function Register() {
  const { signUp } = useAuth();
  const { t } = useTranslation('auth');
  const lp = useLocalizedPath();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { containerRef, token, reset } = useTurnstile();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError(t('register.passwordTooShort')); return; }
    if (password !== confirmPassword) { setError(t('register.passwordMismatch')); return; }
    if (!token) { setError(t('securityCheck')); return; }

    setLoading(true);

    try { await verifyTurnstile(token); } catch {
      setError(t('securityFailed'));
      reset(); setLoading(false); return;
    }

    const { error: authError } = await signUp(email, password);

    if (authError) {
      const msg = authError.message === 'User already registered' ? t('register.alreadyRegistered') : authError.message;
      setError(msg); reset(); setLoading(false);
    } else {
      setSuccess(true); setLoading(false);
    }
  };

  return (
    <div className="grain-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <SEOHead pageKey="register" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-200/30 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cream-200/50 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <img src="/snapeous-logo.svg" alt="Snapeous" className="h-8 w-8" />
            <h1 className="text-2xl font-bold tracking-tight text-[#2A2A2A]">Snapeous</h1>
          </div>
          <p className="text-sm text-[#6b6560]">{t('register.subtitle')}</p>
        </div>

        <div className="card p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-4 text-sm text-green-700">{t('register.successMessage')}</div>
              <Link to={lp('/login')} className="btn-primary w-full inline-flex items-center justify-center">{t('register.loginLink')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="register-email" className="section-label block mb-1.5">{t('register.email')}</label>
                <input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder={t('register.emailPlaceholder')} autoFocus required />
              </div>
              <div>
                <label htmlFor="register-password" className="section-label block mb-1.5">{t('register.password')}</label>
                <div className="relative">
                  <input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pr-10" placeholder={t('register.passwordPlaceholder')} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9080] transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="register-confirm" className="section-label block mb-1.5">{t('register.confirmPassword')}</label>
                <input id="register-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" placeholder={t('register.confirmPlaceholder')} required />
              </div>
              <div ref={containerRef} className="flex justify-center" />
              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">{error}</div>}
              <button type="submit" disabled={loading || !token} className="btn-primary w-full">
                {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={16} />{t('register.submit')}</>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-4 text-sm text-[#6b6560]">
          {t('register.hasAccount')}{' '}
          <Link to={lp('/login')} className="font-medium text-[#2A2A2A] hover:underline">{t('register.loginLink')}</Link>
        </p>
      </div>
    </div>
  );
}
