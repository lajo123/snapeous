import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getProjects } from '@/lib/api';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';
import SEOHead from '@/components/SEOHead';

export default function Dashboard() {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation('dashboard');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  useEffect(() => {
    if (!isLoading && Array.isArray(projects) && projects.length > 0) {
      navigate(`/projects/${projects[0].id}`, { replace: true });
    }
  }, [projects, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <SEOHead pageKey="dashboard" />
      <div className="text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[#F0E6D8]">
          <Loader className="h-8 w-8 text-[#9a9080]" />
        </div>
        <h3 className="mt-5 text-base font-bold text-gray-900">{t('noProjects')}</h3>
        <p className="mt-2 text-sm text-[#6b6560]">{t('noProjectsDesc')}</p>
      </div>
    </div>
  );
}
