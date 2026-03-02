import { useParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useLocalizedPath from '@/hooks/useLocalizedPath';
import SEOHead from '@/components/SEOHead';

export default function ProjectKeywords() {
  const { t } = useTranslation('dashboard');
  const lp = useLocalizedPath();
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <SEOHead pageKey="keywords" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('keywordsTitle')}</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          {t('keywordsSubtitle')}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-soft px-6 py-20 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-brand-50">
          <KeyRound className="h-8 w-8 text-brand-500" />
        </div>
        <h3 className="mt-5 text-base font-semibold text-gray-900">
          {t('keywordsWIP')}
        </h3>
        <p className="mt-2 text-sm text-gray-400 max-w-sm mx-auto">
          {t('keywordsWIPDesc')}{' '}
          <Link
            to={lp(`/projects/${id}/analysis`)}
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            {t('goToAnalysis')}
          </Link>
        </p>
      </div>
    </div>
  );
}
