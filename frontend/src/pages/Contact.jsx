import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft, Mail, User, MessageSquare, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTurnstile } from '@/hooks/useTurnstile';
import useLocalizedPath from '@/hooks/useLocalizedPath';
import { sendContactMessage } from '@/lib/api';
import SEOHead from '@/components/SEOHead';

function LogoIcon({ className = 'w-4 h-4 text-white' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export default function Contact() {
  const { t } = useTranslation('contact');
  const lp = useLocalizedPath();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { containerRef, token, reset } = useTurnstile();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('securityCheck'));
      return;
    }

    setLoading(true);

    try {
      await sendContactMessage({ name, email, subject, message });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || t('errorGeneric'));
      reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain-bg text-[#2A2A2A] antialiased min-h-screen flex flex-col">
      <SEOHead pageKey="contact" />

      {/* navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={lp('/')} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <LogoIcon />
            </div>
            <span className="font-bold text-lg tracking-tight">Snapeous</span>
          </Link>

          <Link
            to={lp('/')}
            className="flex items-center gap-2 text-sm font-medium text-[#6b6560] hover:text-[#2A2A2A] transition-colors"
          >
            <ArrowLeft size={16} />
            {t('backToHome')}
          </Link>
        </div>
      </nav>

      {/* content */}
      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 mb-4">
              <Mail className="w-7 h-7 text-brand-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">{t('title')}</h1>
            <p className="text-[#6b6560] text-lg max-w-md mx-auto">{t('subtitle')}</p>
          </div>

          <div className="card p-6 md:p-8">
            {success ? (
              <div className="text-center space-y-5 py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-200 mb-2">
                  <Send className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">{t('successTitle')}</h2>
                <p className="text-[#6b6560] max-w-sm mx-auto">{t('successMessage')}</p>
                <Link to={lp('/')} className="btn-primary inline-flex items-center gap-2">
                  <ArrowLeft size={16} />
                  {t('backToHome')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-name" className="section-label block mb-1.5">
                      <User size={14} className="inline mr-1.5 -mt-0.5" />
                      {t('form.name')}
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      placeholder={t('form.namePlaceholder')}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="section-label block mb-1.5">
                      <Mail size={14} className="inline mr-1.5 -mt-0.5" />
                      {t('form.email')}
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder={t('form.emailPlaceholder')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="section-label block mb-1.5">
                    <FileText size={14} className="inline mr-1.5 -mt-0.5" />
                    {t('form.subject')}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input"
                    placeholder={t('form.subjectPlaceholder')}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="section-label block mb-1.5">
                    <MessageSquare size={14} className="inline mr-1.5 -mt-0.5" />
                    {t('form.message')}
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input min-h-[160px] resize-y"
                    placeholder={t('form.messagePlaceholder')}
                    required
                    minLength={10}
                  />
                </div>

                <div ref={containerRef} className="flex justify-center" />

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !token} className="btn-primary w-full">
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      {t('form.submit')}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="text-center mt-8 text-sm text-[#9a9080]">
            <p>{t('directEmail')}: <a href="mailto:contact@snapeous.com" className="font-medium text-[#2A2A2A] hover:underline">contact@snapeous.com</a></p>
          </div>
        </div>
      </main>

      {/* footer */}
      <footer className="border-t border-[#E8DCCB]/50 py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-[#9a9080]">&copy; {new Date().getFullYear()} Snapeous.</div>
          <div className="flex items-center gap-6 text-xs text-[#9a9080]">
            <Link to={lp('/legal-notice')} className="hover:text-[#2A2A2A] transition-colors">{t('footer.legalNotice')}</Link>
            <Link to={lp('/privacy')} className="hover:text-[#2A2A2A] transition-colors">{t('footer.privacy')}</Link>
            <Link to={lp('/terms')} className="hover:text-[#2A2A2A] transition-colors">{t('footer.terms')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
