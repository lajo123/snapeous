import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject, getBacklinkStats } from '@/lib/api';
import BacklinkKPICards from '@/components/backlinks/BacklinkKPICards';
import BacklinkTabs from '@/components/backlinks/BacklinkTabs';
import DashboardTab from '@/components/backlinks/DashboardTab';
import LinksTab from '@/components/backlinks/LinksTab';
import AnchorsTab from '@/components/backlinks/AnchorsTab';
import HistoryTab from '@/components/backlinks/HistoryTab';

const VALID_TABS = ['dashboard', 'liens', 'ancres', 'historique'];

export default function ProjectBacklinks() {
  const { id: projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'dashboard';

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });

  const { data: stats } = useQuery({
    queryKey: ['backlink-stats', projectId],
    queryFn: () => getBacklinkStats(projectId),
    staleTime: 60000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Backlinks</h1>
        <p className="page-subtitle">
          {stats?.total_backlinks ?? 0} backlinks trackes pour{' '}
          <span className="font-semibold text-gray-800">{project?.client_domain}</span>
        </p>
      </div>

      {/* KPI Cards */}
      <BacklinkKPICards stats={stats} />

      {/* Tabs */}
      <BacklinkTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardTab projectId={projectId} stats={stats} />
      )}
      {activeTab === 'liens' && (
        <LinksTab projectId={projectId} />
      )}
      {activeTab === 'ancres' && (
        <AnchorsTab projectId={projectId} projectDomain={project?.client_domain} />
      )}
      {activeTab === 'historique' && (
        <HistoryTab projectId={projectId} />
      )}
    </div>
  );
}
