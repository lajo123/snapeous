import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { DEFAULT_LANG } from '@/i18n';

/**
 * Wraps useNavigate() to automatically prefix paths with /:lang.
 * Usage: const navigate = useLocalizedNavigate();
 *        navigate('/dashboard');  // -> /en/dashboard
 */
export default function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { lang } = useParams();
  const currentLang = lang || DEFAULT_LANG;

  return useCallback(
    (to, options) => {
      if (typeof to === 'string' && to.startsWith('/')) {
        navigate(`/${currentLang}${to}`, options);
      } else if (typeof to === 'number') {
        navigate(to);
      } else {
        navigate(to, options);
      }
    },
    [navigate, currentLang]
  );
}
