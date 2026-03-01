import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import { getProjects } from '@/lib/api';

/**
 * Dashboard root page: redirects to the first available project.
 * If no projects exist, Layout handles the empty state via the sidebar.
 */
export default function Dashboard() {
  const navigate = useNavigate();

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
        <Loader className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  // No projects: show empty state
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[#F5F0E8]">
          <Loader className="h-8 w-8 text-[#9a9080]" />
        </div>
        <h3 className="mt-5 text-base font-bold text-gray-900">Aucun projet</h3>
        <p className="mt-2 text-sm text-[#6b6560]">
          Créez votre premier projet depuis le menu en bas à gauche.
        </p>
      </div>
    </div>
  );
}
