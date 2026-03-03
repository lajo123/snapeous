import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

export default function NotFound() {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  return (
    <>
      <SEOHead
        pageKey="notFound"
        titleOverride="404 - Page Not Found | Snapeous"
      />

      <div className="grain-bg min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Large 404 */}
          <p className="text-8xl font-display font-bold text-brand-200 select-none mb-4">
            404
          </p>

          <h1 className="text-2xl font-bold text-ink mb-2">
            Page not found
          </h1>

          <p className="text-ink-400 text-sm mb-8 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/${lang}`}
              className="btn-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <Link
              to={`/${lang}/contact`}
              className="btn-secondary"
            >
              <Search className="h-4 w-4" />
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
