import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  getProject,
  getFootprints,
  getFootprintCategories,
  getSearches,
  createSearch,
} from '@/lib/api';
import {
  cn,
  SEARCH_STATUS_COLORS,
  DIFFICULTY_COLORS,
  formatDate,
} from '@/lib/utils';
import useLocalizedPath from '@/hooks/useLocalizedPath';
import SEOHead from '@/components/SEOHead';
import {
  ArrowLeft,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
} from 'lucide-react';

export default function ProjectSearch() {
  const { t, i18n } = useTranslation('search');
  const tc = useTranslation('common').t;
  const lp = useLocalizedPath();
  const { id: project_id } = useParams();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────

  const [selectedFootprints, setSelectedFootprints] = useState(new Set());
  const [selectedKeywords, setSelectedKeywords] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // ── Queries ──────────────────────────────────────────────────────────

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useQuery({
    queryKey: ['project', project_id],
    queryFn: () => getProject(project_id),
  });

  const { data: footprints = [] } = useQuery({
    queryKey: ['footprints'],
    queryFn: () => getFootprints(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['footprint-categories'],
    queryFn: () => getFootprintCategories(),
  });

  const { data: searches = [] } = useQuery({
    queryKey: ['searches', project_id],
    queryFn: () => getSearches(project_id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !Array.isArray(data)) return false;
      const hasActive = data.some(
        (s) => s.status === 'pending' || s.status === 'running'
      );
      return hasActive ? 3000 : false;
    },
  });

  // ── Derived data ─────────────────────────────────────────────────────

  const keywords = useMemo(() => {
    const analysis = project?.site_analysis;
    const kws = analysis?.keywords ?? project?.keywords ?? [];
    return kws.map((kw) => (typeof kw === 'string' ? kw : kw.keyword));
  }, [project]);

  const footprintsByCategory = useMemo(() => {
    const grouped = {};
    for (const fp of footprints) {
      const cat = fp.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(fp);
    }
    return grouped;
  }, [footprints]);

  const totalQueries = selectedFootprints.size * selectedKeywords.size;

  // ── Mutation ─────────────────────────────────────────────────────────

  const searchMutation = useMutation({
    mutationFn: (data) => createSearch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches', project_id] });
      queryClient.invalidateQueries({ queryKey: ['project', project_id] });
      toast.success(t('searchLaunched', { count: totalQueries }));
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          t('searchError')
      );
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleCategoryAll = (cat) => {
    const catFootprints = footprintsByCategory[cat] || [];
    const catIds = catFootprints.map((fp) => fp.id);
    const allSelected = catIds.every((id) => selectedFootprints.has(id));

    setSelectedFootprints((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        catIds.forEach((id) => next.delete(id));
      } else {
        catIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleFootprint = (fpId) => {
    setSelectedFootprints((prev) => {
      const next = new Set(prev);
      if (next.has(fpId)) next.delete(fpId);
      else next.add(fpId);
      return next;
    });
  };

  const toggleKeyword = (kw) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  const toggleAllKeywords = () => {
    if (selectedKeywords.size === keywords.length) {
      setSelectedKeywords(new Set());
    } else {
      setSelectedKeywords(new Set(keywords));
    }
  };

  const handleLaunchSearch = () => {
    if (totalQueries === 0) return;
    const confirmed = window.confirm(
      t('confirmSearch', { count: totalQueries })
    );
    if (!confirmed) return;

    searchMutation.mutate({
      project_id,
      footprint_ids: Array.from(selectedFootprints),
      keywords: Array.from(selectedKeywords),
    });
  };

  // ── Loading / Error ──────────────────────────────────────────────────

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">{t('projectNotFound')}</p>
        <Link
          to={lp('/dashboard')}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToDashboard')}
        </Link>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <SEOHead pageKey="search" />
      {/* Header */}
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">
          {t('subtitle')}{' '}
          <span className="font-semibold text-gray-900">{project.client_domain}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Footprint selection ──────────────────────────────────── */}
        <div className="card">
          <div className="px-7 py-5 border-b border-[#E8DCCB] flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">{t('footprints')}</h2>
            <span className="text-xs font-medium text-[#9a9080] bg-[#F0E6D8] rounded-full px-2.5 py-1">
              {t('selected', { count: selectedFootprints.size })}
            </span>
          </div>

          <div className="divide-y divide-[#E8DCCB] max-h-[480px] overflow-y-auto">
            {Object.entries(footprintsByCategory).map(([cat, fps]) => {
              const isExpanded = expandedCategories.has(cat);
              const catIds = fps.map((fp) => fp.id);
              const allSelected =
                catIds.length > 0 &&
                catIds.every((id) => selectedFootprints.has(id));
              const someSelected =
                !allSelected && catIds.some((id) => selectedFootprints.has(id));

              return (
                <div key={cat}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-7 py-3 bg-[#FAF7F2]/50 hover:bg-gray-50 transition-colors cursor-pointer select-none">
                    <button
                      onClick={() => toggleCategoryAll(cat)}
                      className="flex-shrink-0 text-gray-400 hover:text-brand-600 transition-colors"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4 text-brand-600" />
                      ) : someSelected ? (
                        <CheckSquare className="h-4 w-4 text-brand-300" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {tc(`category.${cat}`, { defaultValue: cat })}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        {fps.length}
                      </span>
                    </button>
                  </div>

                  {/* Footprint list */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-50/50">
                      {fps.map((fp) => (
                        <label
                          key={fp.id}
                          className="flex items-center gap-3 px-7 pl-16 py-3 hover:bg-brand-50/40 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFootprints.has(fp.id)}
                            onChange={() => toggleFootprint(fp.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="flex-1 text-sm text-gray-700 truncate">
                            {fp.name}
                          </span>
                          {fp.difficulty && (
                            <span
                              className={cn(
                                'text-xs font-medium rounded-full px-2 py-0.5',
                                DIFFICULTY_COLORS[fp.difficulty] ||
                                  'bg-gray-100 text-gray-600'
                              )}
                            >
                              {tc(`difficulty.${fp.difficulty}`, { defaultValue: fp.difficulty })}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {Object.keys(footprintsByCategory).length === 0 && (
              <div className="px-7 py-10 text-center text-sm text-gray-400">
                {t('noFootprints')}
              </div>
            )}
          </div>
        </div>

        {/* ── Keywords selection ───────────────────────────────────── */}
        <div className="space-y-6">
          <div className="card">
            <div className="px-7 py-5 border-b border-[#E8DCCB] flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {t('keywords')}
              </h2>
              {keywords.length > 0 && (
                <button
                  onClick={toggleAllKeywords}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {selectedKeywords.size === keywords.length
                    ? t('deselectAll')
                    : t('selectAll')}
                </button>
              )}
            </div>

            {keywords.length === 0 ? (
              <div className="px-7 py-10 text-center">
                <p className="text-sm text-amber-600 font-medium">
                  {t('analyzeFirst')}
                </p>
                <p className="mt-1.5 text-xs text-gray-400">
                  {t('analyzeFirstDesc')}
                </p>
                <Link
                  to={lp(`/projects/${project_id}/analysis`)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {t('goToAnalysis')}
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#E8DCCB] max-h-[280px] overflow-y-auto">
                {keywords.map((kw) => (
                  <label
                    key={kw}
                    className="flex items-center gap-3 px-7 py-3 hover:bg-brand-50/40 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeywords.has(kw)}
                      onChange={() => toggleKeyword(kw)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">{kw}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ── Search preview ──────────────────────────────────────── */}
          <div className="card p-7">
            <h2 className="text-base font-bold text-gray-900 mb-5">
              {t('searchPreview')}
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid #E8DCCB' }}>
                <p className="text-xs text-[#9a9080]">{t('footprints')}</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">
                  {selectedFootprints.size}
                </p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid #E8DCCB' }}>
                <p className="text-xs text-[#9a9080]">{t('keywords')}</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">
                  {selectedKeywords.size}
                </p>
              </div>
              <div className="rounded-xl p-4 text-center bg-brand-50 border border-brand-100">
                <p className="text-xs font-medium text-brand-600">{t('totalQueries')}</p>
                <p className="mt-1.5 text-xl font-bold text-brand-700">
                  {totalQueries}
                </p>
              </div>
            </div>

            <button
              onClick={handleLaunchSearch}
              disabled={
                totalQueries === 0 || searchMutation.isPending
              }
              className="btn-primary w-full"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('launching')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {t('launchSearch')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Search progress table ─────────────────────────────────── */}
      {searches.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-7 py-5 border-b border-[#E8DCCB]">
            <h2 className="text-base font-bold text-gray-900">
              {t('searchHistory')} ({searches.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: '#FAF7F2' }} className="border-b border-[#E8DCCB]">
                <tr className="text-left">
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('query')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('keyword')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('status')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('results')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">{t('date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DCCB]">
                {searches.map((search) => (
                  <tr
                    key={search.id}
                    className="hover:bg-[#FAF7F2] transition-colors duration-150"
                  >
                    <td className="px-7 py-3.5 text-gray-900 max-w-xs truncate">
                      {search.query || '--'}
                    </td>
                    <td className="px-7 py-3.5 text-gray-700">
                      {search.keyword || '--'}
                    </td>
                    <td className="px-7 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          SEARCH_STATUS_COLORS[search.status] ||
                            'bg-[#E8DCCB] text-gray-700'
                        )}
                      >
                        {tc(`searchStatus.${search.status}`, { defaultValue: search.status })}
                      </span>
                    </td>
                    <td className="px-7 py-3.5 text-gray-700 font-semibold">
                      {search.results_count ?? '--'}
                    </td>
                    <td className="px-7 py-3.5 text-[#9a9080] text-xs">
                      {formatDate(search.created_at, i18n.language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
