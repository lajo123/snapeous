import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProject } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LANG_DATE_LOCALES } from '@/i18n';
import {
  Globe, Target, Key, ExternalLink, Loader, Link2,
  Search, Anchor, TrendingUp, Shield, BarChart3, Users,
} from 'lucide-react';

export default function ProjectDetail() {
  const { id, lang } = useParams();
  const { t } = useTranslation('dashboard');
  const locale = LANG_DATE_LOCALES[lang] || 'en-US';

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader className="h-8 w-8 text-brand-500 animate-spin" /></div>;
  if (isError || !project) return <div className="text-center py-16"><p className="text-[#6b6560]">{t('projectNotFound')}</p></div>;

  const analysis = project.site_analysis;
  const keywordsCount = analysis?.keywords?.length ?? project.keywords?.length ?? 0;
  const anchorsCount = analysis?.suggested_anchors?.length ?? project.anchors?.length ?? 0;
  const spotsCount = project.spots_count ?? 0;
  const backlinksCount = project.backlinks_count ?? 0;
  const searchesCount = project.searches_count ?? 0;
  const targetPagesCount = analysis?.target_pages?.length ?? 0;

  const statCards = [
    { label: t('stat.spots'), value: spotsCount, icon: Target, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: t('stat.backlinks'), value: backlinksCount, icon: Link2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('stat.searches'), value: searchesCount, icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('stat.keywords'), value: keywordsCount, icon: Key, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: t('stat.anchors'), value: anchorsCount, icon: Anchor, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: t('stat.targetPages'), value: targetPagesCount, icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  const dm = analysis?.domain_metrics;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">{project.name}</h1>
          {project.niche && <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">{project.niche}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-[#6b6560]">
          <Globe className="h-4 w-4" />
          <span>{project.client_domain}</span>
          <a href={`https://${project.client_domain}`} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-700 transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </div>

      {dm && (
        <div className="card p-7">
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('domainMetrics')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { icon: Shield, color: 'text-brand-600', label: t('domainRank'), value: dm.domain_rank ?? '--' },
              { icon: BarChart3, color: 'text-blue-600', label: t('urlRank'), value: dm.url_rank ?? '--' },
              { icon: Link2, color: 'text-violet-600', label: 'Backlinks', value: dm.backlinks_count != null ? Number(dm.backlinks_count).toLocaleString(locale) : '--' },
              { icon: Users, color: 'text-amber-600', label: t('refDomains'), value: dm.referring_domains != null ? Number(dm.referring_domains).toLocaleString(locale) : '--' },
              { icon: TrendingUp, color: 'text-rose-600', label: t('dofollow'), value: (() => { const df = Number(dm.dofollow_backlinks || 0); const nf = Number(dm.nofollow_backlinks || 0); const total = df + nf; return total > 0 ? `${Math.round((df / total) * 100)}%` : '--'; })() },
            ].map(({ icon: Icon, color, label, value }) => (
              <div key={label} className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #E8DCCB' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-6">
            <div className="flex items-center justify-between mb-4"><div className={cn('rounded-xl p-2.5', bg)}><Icon className={cn('h-5 w-5', color)} /></div></div>
            <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
            <p className="mt-1 text-sm text-[#6b6560]">{label}</p>
          </div>
        ))}
      </div>

      {analysis && analysis.status === 'completed' && (
        <div className="card p-7">
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('analysisSummary')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {analysis.niche && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #E8DCCB' }}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('nicheDetected')}</p>
                <p className="mt-1.5 text-sm font-bold text-gray-900">{analysis.niche}</p>
              </div>
            )}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #E8DCCB' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('pagesCrawled')}</p>
              <p className="mt-1.5 text-sm font-bold text-gray-900">{analysis.pages_crawled ?? 0}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #E8DCCB' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('method')}</p>
              <p className="mt-1.5 text-sm font-bold text-gray-900">
                {analysis.analysis_method === 'fast_fallback' ? t('methodFastFallback') : analysis.analysis_method === 'ai' ? t('methodAI') : analysis.analysis_method ?? '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {analysis?.status === 'analyzing' && (
        <div className="card px-6 py-12 text-center">
          <Loader className="h-10 w-10 text-brand-500 animate-spin mx-auto" />
          <h3 className="mt-4 text-base font-bold text-gray-900">{t('analyzing')}</h3>
          <p className="mt-2 text-sm text-[#6b6560]">{analysis.progress || t('analyzingDesc')}</p>
        </div>
      )}
    </div>
  );
}
