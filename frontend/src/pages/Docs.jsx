import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Code2, Key, Webhook, ArrowLeft, ArrowRight } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

const SECTIONS = [
  { icon: Key, titleKey: 'sections.auth.title', descKey: 'sections.auth.desc' },
  { icon: Code2, titleKey: 'sections.endpoints.title', descKey: 'sections.endpoints.desc' },
  { icon: Webhook, titleKey: 'sections.webhooks.title', descKey: 'sections.webhooks.desc' },
];

export default function Docs() {
  const { t, i18n } = useTranslation('docs');
  const lang = i18n.language || 'en';

  return (
    <>
      <SEOHead pageKey="docs" />

      <div className="grain-bg min-h-screen">
        {/* Header */}
        <div className="max-w-3xl mx-auto px-6 pt-24 pb-12">
          <Link
            to={`/${lang}`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backHome')}
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold mb-6">
            <BookOpen className="h-3.5 w-3.5" />
            {t('badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink mb-3">
            {t('title')}
          </h1>
          <p className="text-ink-400">{t('subtitle')}</p>
        </div>

        {/* Section cards */}
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <div className="grid gap-4">
            {SECTIONS.map(({ icon: Icon, titleKey, descKey }) => (
              <div
                key={titleKey}
                className="group bg-surface rounded-2xl border border-ink-50/50 p-6 transition-shadow hover:shadow-soft-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-ink mb-1">{t(titleKey)}</h2>
                    <p className="text-sm text-ink-400">{t(descKey)}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-ink-200 group-hover:text-brand-500 transition-colors shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coming soon */}
        <div className="max-w-3xl mx-auto px-6 pb-24 text-center">
          <div className="bg-surface-warm rounded-2xl border border-ink-50/50 p-8">
            <h3 className="text-lg font-bold text-ink mb-2">{t('comingSoon.title')}</h3>
            <p className="text-sm text-ink-400 max-w-md mx-auto">
              {t('comingSoon.desc')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
