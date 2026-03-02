import { Navigate, useLocation } from 'react-router-dom';
import { SUPPORTED_LANGS, DEFAULT_LANG } from '@/i18n';

/**
 * Catch-all: redirects old routes without lang prefix to the localized version.
 * e.g. /login -> /en/login, /dashboard -> /en/dashboard
 */
export default function LegacyRedirect() {
  const location = useLocation();

  // Determine best language
  let lang = DEFAULT_LANG;
  const stored = localStorage.getItem('i18nextLng');
  if (stored && SUPPORTED_LANGS.includes(stored)) {
    lang = stored;
  }

  return <Navigate to={`/${lang}${location.pathname}`} replace />;
}
