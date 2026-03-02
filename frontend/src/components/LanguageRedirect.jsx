import { Navigate } from 'react-router-dom';
import { SUPPORTED_LANGS, DEFAULT_LANG } from '@/i18n';

/**
 * Detects the user's preferred language and redirects `/` to `/:lang/`.
 * Priority: localStorage > navigator.language > default (en).
 */
export default function LanguageRedirect() {
  let lang = DEFAULT_LANG;

  // Check localStorage
  const stored = localStorage.getItem('i18nextLng');
  if (stored && SUPPORTED_LANGS.includes(stored)) {
    lang = stored;
  } else {
    // Check navigator
    const navLang = navigator.language?.split('-')[0];
    if (navLang && SUPPORTED_LANGS.includes(navLang)) {
      lang = navLang;
    }
  }

  return <Navigate to={`/${lang}/`} replace />;
}
