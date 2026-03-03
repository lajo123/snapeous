import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Bug, Zap, ArrowLeft } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { LANG_DATE_LOCALES } from '@/i18n';

const ICON_MAP = {
  feature: Sparkles,
  improvement: Zap,
  fix: Bug,
};

const COLOR_MAP = {
  feature: 'bg-emerald-50 text-emerald-600',
  improvement: 'bg-blue-50 text-blue-600',
  fix: 'bg-amber-50 text-amber-600',
};

// Changelog entries – update manually or connect to a CMS later
const ENTRIES = [
  {
    version: '1.2.0',
    date: '2026-02-28',
    items: [
      { type: 'feature', key: 'v120.domainMetrics' },
      { type: 'feature', key: 'v120.backlinkHistory' },
      { type: 'improvement', key: 'v120.fasterAnalysis' },
      { type: 'fix', key: 'v120.loginFix' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-01-15',
    items: [
      { type: 'feature', key: 'v110.multiLanguage' },
      { type: 'feature', key: 'v110.footprints' },
      { type: 'improvement', key: 'v110.dashboardRedesign' },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-12-01',
    items: [
      { type: 'feature', key: 'v100.launch' },
      { type: 'feature', key: 'v100.spotDiscovery' },
      { type: 'feature', key: 'v100.seoAnalysis' },
    ],
  },
];

export default function Changelog() {
  const { t, i18n } = useTranslation('changelog');
  const lang = i18n.language || 'en';

  return (
    <>
      <SEOHead pageKey="changelog" />

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
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink mb-3">
            {t('title')}
          </h1>
          <p className="text-ink-400">{t('subtitle')}</p>
        </div>

        {/* Timeline */}
        <div className="max-w-3xl mx-auto px-6 pb-24">
          <div className="relative border-l-2 border-ink-50 ml-4 space-y-12">
            {ENTRIES.map((release) => (
              <div key={release.version} className="relative pl-8">
                {/* Dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-brand-500 border-[3px] border-cream" />

                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-lg font-bold text-ink">v{release.version}</h2>
                  <time className="text-xs text-ink-300">
                    {new Date(release.date).toLocaleDateString(LANG_DATE_LOCALES[lang] ?? 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                <ul className="space-y-3">
                  {release.items.map((item) => {
                    const Icon = ICON_MAP[item.type];
                    return (
                      <li key={item.key} className="flex items-start gap-3">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${COLOR_MAP[item.type]}`}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                            {t(`types.${item.type}`)}
                          </span>
                          <p className="text-sm text-ink mt-0.5">{t(`entries.${item.key}`)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
