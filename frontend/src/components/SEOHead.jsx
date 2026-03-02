import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { SUPPORTED_LANGS } from '@/i18n';

const BASE_URL = 'https://snapeous.com';

export default function SEOHead({ pageKey, titleOverride, descriptionOverride }) {
  const { t, i18n } = useTranslation('seo');
  const location = useLocation();
  const lang = i18n.language;

  const title = titleOverride || t(`${pageKey}.title`, { defaultValue: 'Snapeous' });
  const description = descriptionOverride || t(`${pageKey}.description`, { defaultValue: '' });
  const siteName = t('og.siteName', { defaultValue: 'Snapeous' });

  // Build canonical URL for current language
  const canonical = `${BASE_URL}${location.pathname}`;

  // Build hreflang alternates: same path but with different lang prefix
  const pathWithoutLang = location.pathname.replace(/^\/(en|fr|es|de|it|pt)(\/|$)/, '/');
  const alternates = SUPPORTED_LANGS.map((lng) => ({
    lng,
    href: `${BASE_URL}/${lng}${pathWithoutLang === '/' ? '' : pathWithoutLang}`,
  }));

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title}</title>
      {description && <meta name="description" content={description} />}

      {/* Canonical */}
      <link rel="canonical" href={canonical} />

      {/* Hreflang alternates */}
      {alternates.map(({ lng, href }) => (
        <link key={lng} rel="alternate" hrefLang={lng} href={href} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/en${pathWithoutLang === '/' ? '' : pathWithoutLang}`} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={lang} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  );
}
