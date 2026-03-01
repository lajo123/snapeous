import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Globe,
  Target,
  Key,
  ExternalLink,
  Loader,
  Link2,
  Search,
  Anchor,
  TrendingUp,
  Shield,
  BarChart3,
  Users,
} from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="text-center py-16">
        <p className="text-[#6b6560]">Projet introuvable.</p>
      </div>
    );
  }

  const analysis = project.site_analysis;
  const keywordsCount = analysis?.keywords?.length ?? project.keywords?.length ?? 0;
  const anchorsCount = analysis?.suggested_anchors?.length ?? project.anchors?.length ?? 0;
  const spotsCount = project.spots_count ?? 0;
  const backlinksCount = project.backlinks_count ?? 0;
  const searchesCount = project.searches_count ?? 0;
  const targetPagesCount = analysis?.target_pages?.length ?? 0;

  const statCards = [
    { label: 'Spots',       value: spotsCount,       icon: Target,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Backlinks',   value: backlinksCount,   icon: Link2,      color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Recherches',  value: searchesCount,    icon: Search,     color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Mots-clés',   value: keywordsCount,    icon: Key,        color: 'text-violet-600',  bg: 'bg-violet-50' },
    { label: 'Ancres',      value: anchorsCount,     icon: Anchor,     color: 'text-rose-600',    bg: 'bg-rose-50' },
    { label: 'Pages cibles', value: targetPagesCount, icon: TrendingUp, color: 'text-cyan-600',    bg: 'bg-cyan-50' },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">{project.name}</h1>
          {project.niche && (
            <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
              {project.niche}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-[#6b6560]">
          <Globe className="h-4 w-4" />
          <span>{project.client_domain}</span>
          <a href={`https://${project.client_domain}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('rounded-xl p-2.5', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
            <p className="mt-1 text-sm text-[#6b6560]">{label}</p>
          </div>
        ))}
      </div>

      {/* Analysis summary */}
      {analysis && analysis.status === 'completed' && (
        <div className="card p-7">
          <h2 className="text-base font-bold text-gray-900 mb-5">Résumé de l'analyse</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {analysis.niche && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Niche détectée</p>
                <p className="mt-1.5 text-sm font-bold text-gray-900">{analysis.niche}</p>
              </div>
            )}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Pages crawlées</p>
              <p className="mt-1.5 text-sm font-bold text-gray-900">{analysis.pages_crawled ?? 0}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Méthode</p>
              <p className="mt-1.5 text-sm font-bold text-gray-900">
                {analysis.analysis_method === 'fast_fallback' ? 'Analyse rapide' : analysis.analysis_method === 'ai' ? 'IA' : analysis.analysis_method ?? '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Domain metrics from DomDetailer */}
      {analysis?.domain_metrics && (
        <div className="card p-7">
          <h2 className="text-base font-bold text-gray-900 mb-5">Métriques du domaine</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">DR</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analysis.domain_metrics.domain_rank ?? '--'}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">UR</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analysis.domain_metrics.url_rank ?? '--'}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Link2 className="h-4 w-4 text-violet-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Backlinks</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.domain_metrics.backlinks_count != null
                  ? Number(analysis.domain_metrics.backlinks_count).toLocaleString('fr-FR')
                  : '--'}
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Ref. Domains</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.domain_metrics.referring_domains != null
                  ? Number(analysis.domain_metrics.referring_domains).toLocaleString('fr-FR')
                  : '--'}
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="h-4 w-4 text-rose-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Dofollow</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.domain_metrics.dofollow_backlinks != null && analysis.domain_metrics.nofollow_backlinks != null
                  ? (() => {
                      const df = Number(analysis.domain_metrics.dofollow_backlinks);
                      const nf = Number(analysis.domain_metrics.nofollow_backlinks);
                      const total = df + nf;
                      return total > 0 ? `${Math.round((df / total) * 100)}%` : '--';
                    })()
                  : '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing state */}
      {analysis?.status === 'analyzing' && (
        <div className="card px-6 py-12 text-center">
          <Loader className="h-10 w-10 text-emerald-500 animate-spin mx-auto" />
          <h3 className="mt-4 text-base font-bold text-gray-900">Analyse en cours...</h3>
          <p className="mt-2 text-sm text-[#6b6560]">
            {analysis.progress || "Le site est en cours d'analyse. Cette page se rafraîchit automatiquement."}
          </p>
        </div>
      )}
    </div>
  );
}
