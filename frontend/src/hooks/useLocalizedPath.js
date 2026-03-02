import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { DEFAULT_LANG } from '@/i18n';

/**
 * Returns a helper function to build localized paths.
 * Usage: const lp = useLocalizedPath();
 *        <Link to={lp('/dashboard')}>Dashboard</Link>
 */
export default function useLocalizedPath() {
  const { lang } = useParams();
  const currentLang = lang || DEFAULT_LANG;

  return useCallback(
    (path) => {
      if (path.startsWith('/')) {
        return `/${currentLang}${path}`;
      }
      return path;
    },
    [currentLang]
  );
}
