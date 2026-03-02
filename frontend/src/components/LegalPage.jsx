import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

function LogoIcon({ className = 'w-4 h-4 text-white' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export default function LegalPage({ pageKey }) {
  const { t } = useTranslation('legal');
  const sections = t(`${pageKey}.sections`, { returnObjects: true });
  const title = t(`${pageKey}.title`);

  return (
    <div className="grain-bg text-[#2A2A2A] antialiased min-h-screen flex flex-col">
      {/* navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to=".." className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <LogoIcon />
            </div>
            <span className="font-bold text-lg tracking-tight">Snapeous</span>
          </Link>

          <Link
            to=".."
            className="flex items-center gap-2 text-sm font-medium text-[#6b6560] hover:text-[#2A2A2A] transition-colors"
          >
            <ArrowLeft size={16} />
            {t('backToHome')}
          </Link>
        </div>
      </nav>

      {/* content */}
      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{title}</h1>
          <p className="text-sm text-[#9a9080] mb-12">
            {t('lastUpdated', { date: '01/03/2026' })}
          </p>

          <div className="space-y-10">
            {Array.isArray(sections) && sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-xl font-semibold tracking-tight mb-3 text-[#2A2A2A]">
                  {i + 1}. {section.title}
                </h2>
                <div className="text-[15px] text-[#4a4a4a] leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* footer */}
      <footer className="border-t border-[#E8DCCB]/50 py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-[#9a9080]">&copy; {new Date().getFullYear()} Snapeous.</div>
          <div className="flex items-center gap-6 text-xs text-[#9a9080]">
            <Link to="../legal-notice" className="hover:text-[#2A2A2A] transition-colors">{t('legalNotice.title')}</Link>
            <Link to="../privacy" className="hover:text-[#2A2A2A] transition-colors">{t('privacy.title')}</Link>
            <Link to="../terms" className="hover:text-[#2A2A2A] transition-colors">{t('terms.title')}</Link>
            <Link to="../gdpr" className="hover:text-[#2A2A2A] transition-colors">{t('gdpr.title')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
