import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  FolderOpen,
  Search,
  MapPin,
  Activity,
  Plus,
  ArrowRight,
  Globe,
  Loader,
} from 'lucide-react';
import { getProjects, getDashboardStats } from '@/lib/api';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';
import useAnimatedCount from '@/hooks/useAnimatedCount';
import SEOHead from '@/components/SEOHead';
import { cn } from '@/lib/utils';

/* ── Skeleton placeholder ─────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-50/50 bg-white/80 p-5 animate-pulse">
      <div className="h-3 w-16 bg-ink-50 rounded mb-3" />
      <div className="h-7 w-12 bg-ink-50 rounded" />
    </div>
  );
}

function ProjectRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="h-9 w-9 rounded-xl bg-ink-50" />
      <div className="flex-1">
        <div className="h-3.5 w-32 bg-ink-50 rounded mb-1.5" />
        <div className="h-2.5 w-48 bg-ink-50 rounded" />
      </div>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, accent }) {
  const animatedValue = useAnimatedCount(typeof value === 'number' ? value : null);

  return (
    <div className="rounded-2xl border border-ink-50/50 bg-white/80 backdrop-blur-sm p-5 transition-shadow hover:shadow-soft">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('rounded-lg p-1.5', accent || 'bg-brand-50')}>
          <Icon className={cn('h-3.5 w-3.5', accent ? 'text-current' : 'text-brand-600')} />
        </div>
        <span className="text-xs font-medium text-ink-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-ink tabular-nums">
        {typeof value === 'number' ? animatedValue : (value ?? '—')}
      </p>
    </div>
  );
}

/* ── Empty State ────────────────────────────────────────────── */

function EmptyDashboard({ t, navigate }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 mb-5">
        <FolderOpen className="h-7 w-7 text-brand-500" />
      </div>
      <h2 className="text-lg font-bold text-ink mb-2">{t('createFirstProject')}</h2>
      <p className="text-sm text-ink-400 max-w-sm mb-6">{t('createFirstProjectDesc')}</p>
      <button
        onClick={() => navigate('/projects/new')}
        className="btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {t('newProject')}
      </button>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation('dashboard');

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const isLoading = loadingProjects || loadingStats;
  const hasProjects = Array.isArray(projects) && projects.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <SEOHead pageKey="dashboard" />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ink">{t('overview')}</h1>
        <p className="text-sm text-ink-400 mt-1">{t('overviewSubtitle')}</p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={FolderOpen}
            label={t('totalProjects')}
            value={stats?.projects_count ?? 0}
          />
          <StatCard
            icon={MapPin}
            label={t('totalSpots')}
            value={stats?.spots_count ?? 0}
            accent="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={Search}
            label={t('totalSearches')}
            value={stats?.searches_count ?? 0}
            accent="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={Activity}
            label={t('activeSearches')}
            value={stats?.active_searches ?? 0}
            accent="bg-amber-50 text-amber-600"
          />
        </div>
      )}

      {/* Content area */}
      {isLoading ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent projects skeleton */}
          <div className="lg:col-span-2 rounded-2xl border border-ink-50/50 bg-white/80 p-5">
            <div className="h-4 w-32 bg-ink-50 rounded mb-4 animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <ProjectRowSkeleton key={i} />
            ))}
          </div>
          {/* Quick actions skeleton */}
          <div className="rounded-2xl border border-ink-50/50 bg-white/80 p-5 animate-pulse">
            <div className="h-4 w-28 bg-ink-50 rounded mb-4" />
            <div className="h-10 w-full bg-ink-50 rounded-xl mb-3" />
            <div className="h-10 w-full bg-ink-50 rounded-xl" />
          </div>
        </div>
      ) : !hasProjects ? (
        <EmptyDashboard t={t} navigate={navigate} />
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent Projects */}
          <div className="lg:col-span-2 rounded-2xl border border-ink-50/50 bg-white/80 backdrop-blur-sm p-5">
            <h2 className="text-sm font-bold text-ink mb-3">{t('recentProjects')}</h2>
            <div className="divide-y divide-ink-50/50">
              {projects.slice(0, 5).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex items-center gap-3 py-3 w-full text-left group hover:bg-surface-muted/50 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{project.name}</p>
                    <p className="text-xs text-ink-400 truncate">{project.domain}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-200 group-hover:text-brand-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-ink-50/50 bg-white/80 backdrop-blur-sm p-5">
            <h2 className="text-sm font-bold text-ink mb-3">{t('quickActions')}</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/projects/new')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-ink-50/50 bg-surface-muted/30 hover:bg-surface-muted text-sm font-medium text-ink transition-colors"
              >
                <Plus className="h-4 w-4 text-brand-500" />
                {t('newProject')}
              </button>
            </div>

            {/* Spots by Status */}
            {stats?.spots_by_status && Object.keys(stats.spots_by_status).length > 0 && (
              <div className="mt-5 pt-5 border-t border-ink-50/50">
                <h3 className="text-xs font-semibold text-ink-400 mb-3">{t('spotsByStatus')}</h3>
                <div className="space-y-2">
                  {Object.entries(stats.spots_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className="text-ink-600 capitalize">{status}</span>
                      <span className="font-semibold text-ink tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
