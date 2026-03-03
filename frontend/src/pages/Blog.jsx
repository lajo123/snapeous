import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ArrowRight, Clock } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { LANG_DATE_LOCALES } from '@/i18n';

// Placeholder posts – replace with real data / CMS fetch later
const PLACEHOLDER_POSTS = [
  {
    slug: 'what-are-backlinks',
    titleKey: 'posts.backlinks.title',
    excerptKey: 'posts.backlinks.excerpt',
    date: '2026-02-15',
    readTime: 8,
    category: 'SEO Basics',
  },
  {
    slug: 'link-building-strategies-2026',
    titleKey: 'posts.linkBuilding.title',
    excerptKey: 'posts.linkBuilding.excerpt',
    date: '2026-02-01',
    readTime: 12,
    category: 'Strategy',
  },
  {
    slug: 'domain-authority-explained',
    titleKey: 'posts.domainAuthority.title',
    excerptKey: 'posts.domainAuthority.excerpt',
    date: '2026-01-20',
    readTime: 6,
    category: 'SEO Basics',
  },
];

export default function Blog() {
  const { t, i18n } = useTranslation('blog');
  const lang = i18n.language || 'en';

  return (
    <>
      <SEOHead pageKey="blog" />

      <div className="grain-bg min-h-screen">
        {/* Header */}
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold mb-6">
            <BookOpen className="h-3.5 w-3.5" />
            {t('badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink mb-4">
            {t('title')}
          </h1>
          <p className="text-ink-400 max-w-lg mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Posts grid */}
        <div className="max-w-4xl mx-auto px-6 pb-24">
          <div className="grid gap-6">
            {PLACEHOLDER_POSTS.map((post) => (
              <article
                key={post.slug}
                className="group bg-surface rounded-2xl border border-ink-50/50 p-6 transition-shadow hover:shadow-soft-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-ink-300">
                        <Clock className="h-3 w-3" />
                        {post.readTime} {t('minRead')}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-ink mb-2 group-hover:text-brand-600 transition-colors">
                      {t(post.titleKey)}
                    </h2>
                    <p className="text-sm text-ink-400 line-clamp-2">
                      {t(post.excerptKey)}
                    </p>
                    <time className="block mt-3 text-xs text-ink-300">
                      {new Date(post.date).toLocaleDateString(LANG_DATE_LOCALES[lang] ?? 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <ArrowRight className="h-5 w-5 text-ink-200 group-hover:text-brand-500 transition-colors shrink-0 mt-1" />
                </div>
              </article>
            ))}
          </div>

          {/* Coming soon note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-ink-300">{t('comingSoon')}</p>
            <Link to={`/${lang}`} className="inline-block mt-4 text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors">
              &larr; {t('backHome')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
