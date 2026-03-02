import { useEffect } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, DEFAULT_LANG } from '@/i18n';

/**
 * Validates the `:lang` URL param and syncs i18next + document lang.
 * If the lang param is invalid, redirects to the default language.
 */
export default function LanguageWrapper() {
  const { lang } = useParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && SUPPORTED_LANGS.includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    if (lang) {
      document.documentElement.lang = lang;
    }
  }, [lang, i18n]);

  if (!lang || !SUPPORTED_LANGS.includes(lang)) {
    return <Navigate to={`/${DEFAULT_LANG}/`} replace />;
  }

  return <Outlet />;
}
