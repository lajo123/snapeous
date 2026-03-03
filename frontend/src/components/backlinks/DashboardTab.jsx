import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { getBacklinkHistory, getBacklinkDomains } from '@/lib/api';
import DofollowNofollowChart from './charts/DofollowNofollowChart';
import TopDomainsChart from './charts/TopDomainsChart';
import DADistributionChart from './charts/DADistributionChart';
import GainedLostChart from './charts/GainedLostChart';

function generateAlerts(stats, t) {
  if (!stats) return [];
  const alerts = [];

  if (stats.lost_count > 0) {
    alerts.push({
      type: 'danger',
      icon: AlertTriangle,
      message: t('dashboard.lostAlert', { count: stats.lost_count }),
    });
  }

  if (stats.not_checked_count > 10) {
    alerts.push({
      type: 'info',
      icon: RefreshCw,
      message: t('dashboard.notCheckedAlert', { count: stats.not_checked_count }),
    });
  }

  return alerts;
}

const ALERT_STYLES = {
  danger: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export default function DashboardTab({ projectId, stats }) {
  const { t } = useTranslation('backlinks');

  const { data: historyData } = useQuery({
    queryKey: ['backlink-history', projectId, 'month'],
    queryFn: () => getBacklinkHistory(projectId, { period: 'month', limit: 50 }),
    staleTime: 60000,
  });

  const { data: domains } = useQuery({
    queryKey: ['backlink-domains', projectId],
    queryFn: () => getBacklinkDomains(projectId, { limit: 10 }),
    staleTime: 60000,
  });

  const alerts = generateAlerts(stats, t);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${ALERT_STYLES[alert.type]}`}>
              <alert.icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">{t('dashboard.dofollowVsNofollow')}</h3>
          <DofollowNofollowChart
            dofollow={stats?.dofollow_count || 0}
            nofollow={stats?.nofollow_count || 0}
          />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">{t('dashboard.topDomains')}</h3>
          <TopDomainsChart domains={domains || stats?.top_referring_domains || []} />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">{t('dashboard.daDistribution')}</h3>
          <DADistributionChart distribution={stats?.da_distribution || {}} />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">{t('dashboard.gainedLost')}</h3>
          <GainedLostChart timeline={historyData?.timeline || []} />
        </div>
      </div>
    </div>
  );
}
