import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, CheckCircle, XCircle, RefreshCw, BarChart3, Clock } from 'lucide-react';
import { getBacklinkHistory } from '@/lib/api';
import { cn, truncateUrl, formatDate } from '@/lib/utils';
import GainedLostChart from './charts/GainedLostChart';

const EVENT_CONFIG = {
  created: { icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Cree' },
  status_changed: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Statut modifie' },
  http_changed: { icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-100', label: 'HTTP modifie' },
  metrics_updated: { icon: BarChart3, color: 'text-violet-500', bg: 'bg-violet-100', label: 'Metriques mises a jour' },
};

function getEventIcon(event) {
  if (event.event_type === 'status_changed') {
    if (event.new_status === 'active') return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100' };
    if (event.new_status === 'lost') return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' };
  }
  return EVENT_CONFIG[event.event_type] || EVENT_CONFIG.created;
}

const STATUS_BADGES = {
  active: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
};

const STATUS_LABELS = {
  active: 'Actif',
  lost: 'Perdu',
  pending: 'En attente',
};

export default function HistoryTab({ projectId }) {
  const [period, setPeriod] = useState('week');

  const { data, isLoading } = useQuery({
    queryKey: ['backlink-history', projectId, period],
    queryFn: () => getBacklinkHistory(projectId, { period, limit: 100 }),
    staleTime: 60000,
  });

  const events = data?.events || [];
  const timeline = data?.timeline || [];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {['day', 'week', 'month'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              period === p ? "bg-emerald-100 text-emerald-700" : "bg-[#FAF7F2] text-[#5a5550] hover:bg-white"
            )}
          >
            {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Liens gagnes / perdus par periode</h3>
        <GainedLostChart timeline={timeline} />
      </div>

      {/* Timeline */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Timeline des evenements</h3>

        {isLoading ? (
          <p className="text-center py-8 text-gray-400">Chargement...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">L'historique commence a partir de maintenant.</p>
            <p className="text-xs text-gray-300 mt-1">Les changements futurs seront enregistres ici.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {events.map((event, i) => {
              const config = getEventIcon(event);
              const Icon = config.icon;
              return (
                <div key={event.id} className="flex gap-4 relative">
                  {/* Timeline line */}
                  {i < events.length - 1 && (
                    <div className="absolute left-[17px] top-10 bottom-0 w-px bg-gray-200" />
                  )}
                  {/* Icon */}
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {EVENT_CONFIG[event.event_type]?.label || event.event_type}
                      </span>
                      <span className="text-xs text-[#6b6560]">
                        {event.changed_at ? formatDate(event.changed_at) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {event.source_url && truncateUrl(event.source_url, 50)}
                    </p>
                    {event.event_type === 'status_changed' && (
                      <div className="flex items-center gap-2 mt-1">
                        {event.old_status && (
                          <span className={cn("badge text-xs", STATUS_BADGES[event.old_status])}>
                            {STATUS_LABELS[event.old_status] || event.old_status}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">→</span>
                        {event.new_status && (
                          <span className={cn("badge text-xs", STATUS_BADGES[event.new_status])}>
                            {STATUS_LABELS[event.new_status] || event.new_status}
                          </span>
                        )}
                      </div>
                    )}
                    {event.event_type === 'http_changed' && (
                      <p className="text-xs text-gray-500 mt-1">
                        HTTP {event.old_http_code || '?'} → {event.new_http_code || '?'}
                      </p>
                    )}
                    {event.domain_rank_snapshot && (
                      <span className="text-[10px] text-[#6b6560] mt-1 inline-block">DR: {event.domain_rank_snapshot}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
