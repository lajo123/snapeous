import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getProject, analyzeProject, updateProject, getSitemapPages } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import SEOHead from '@/components/SEOHead';
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Target,
  AlertCircle,
  X,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Link2,
  Shield,
  BarChart3,
  Users,
  TrendingUp,
} from 'lucide-react';

// ── Badge color maps ─────────────────────────────────────────────────

const INTENTION_BADGE = {
  informational: 'bg-blue-50 text-blue-700',
  transactional: 'bg-brand-50 text-brand-700',
  commercial: 'bg-violet-50 text-violet-700',
  navigational: 'bg-surface-muted text-ink-500',
};

const PRIORITY_BADGE = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-surface-muted text-ink-500',
};

const ANCHOR_TYPE_BADGE = {
  exact: 'bg-red-50 text-red-700',
  partial: 'bg-blue-50 text-blue-700',
  optimized: 'bg-red-50 text-red-700',
  semi_optimized: 'bg-blue-50 text-blue-700',
  brand: 'bg-brand-50 text-brand-700',
  generic: 'bg-surface-muted text-ink-500',
  naked_url: 'bg-violet-50 text-violet-700',
};

const RECO_TYPE_BADGE = {
  content: 'bg-blue-50 text-blue-700',
  link_type: 'bg-violet-50 text-violet-700',
  anchor_strategy: 'bg-amber-50 text-amber-700',
  page_priority: 'bg-brand-50 text-brand-700',
};

const LANGUAGE_OPTION_KEYS = ['', 'fr', 'en', 'es', 'de', 'it', 'pt', 'nl'];

// ── Sitemap Picker Modal ─────────────────────────────────────────────

function SitemapPickerModal({ projectId, existingUrls, onAdd, onClose }) {
  const { t } = useTranslation('analysis');
  const [langFilter, setLangFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sitemap-pages', projectId, langFilter, page],
    queryFn: () =>
      getSitemapPages(projectId, {
        language: langFilter || undefined,
        page,
        per_page: 20,
      }),
  });

  const pages = data?.pages ?? [];
  const languages = data?.languages ?? {};
  const totalPages = data?.total_pages ?? 1;
  const existingSet = new Set(existingUrls);

  const filtered = searchFilter
    ? pages.filter((p) => p.url.toLowerCase().includes(searchFilter.toLowerCase()))
    : pages;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">
            {t('sitemapTitle')}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-300 hover:bg-cream-50 hover:text-ink-500 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Language tabs + search */}
        <div className="px-6 py-3 border-b border-ink-50/50 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setLangFilter(''); setPage(1); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all',
              !langFilter
                ? 'bg-brand-100 text-brand-700'
                : 'bg-surface-muted text-ink-400 hover:bg-cream-50'
            )}
          >
            {t('allLanguages')}
          </button>
          {Object.entries(languages).map(([lang, count]) => (
            <button
              key={lang}
              onClick={() => { setLangFilter(lang); setPage(1); }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                langFilter === lang
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-surface-muted text-ink-400 hover:bg-cream-50'
              )}
            >
              {lang.toUpperCase()} ({count})
            </button>
          ))}
          <div className="ml-auto">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={t('filterUrls')}
              className="rounded-lg border border-ink-100 px-3 py-1.5 text-xs text-ink-600 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-200 w-56"
            />
          </div>
        </div>

        {/* Pages list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-brand-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-300">
              {pages.length === 0
                ? t('noSitemapPages')
                : t('noFilterMatch')}
            </div>
          ) : (
            <ul className="divide-y divide-ink-50">
              {filtered.map((p, i) => {
                const alreadyAdded = existingSet.has(p.url);
                return (
                  <li
                    key={i}
                    className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-brand-50/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {p.language && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 uppercase flex-shrink-0">
                          {p.language}
                        </span>
                      )}
                      <span className="text-sm text-ink-600 truncate">
                        {p.url}
                      </span>
                    </div>
                    <button
                      onClick={() => !alreadyAdded && onAdd(p)}
                      disabled={alreadyAdded}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex-shrink-0',
                        alreadyAdded
                          ? 'bg-surface-muted text-ink-200 cursor-not-allowed'
                          : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                      )}
                    >
                      {alreadyAdded ? t('added') : t('addBtn')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-ink-50 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-400 hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('previous')}
            </button>
            <span className="text-xs text-ink-300">
              {t('page', { current: page, total: totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-400 hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {t('next')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

export default function ProjectAnalysis() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('analysis');

  const isAnalyzing = (data) =>
    data?.site_analysis?.status === 'analyzing';

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    refetchInterval: (query) =>
      isAnalyzing(query.state.data) ? 3000 : false,
  });

  // ── Local editable state ────────────────────────────────────────────

  const [editedKeywords, setEditedKeywords] = useState(null);
  const [editedAnchors, setEditedAnchors] = useState(null);
  const [keywordsDirty, setKeywordsDirty] = useState(false);
  const [anchorsDirty, setAnchorsDirty] = useState(false);

  // Niches
  const [editedNiches, setEditedNiches] = useState(null);
  const [nichesDirty, setNichesDirty] = useState(false);
  const [isAddingNiche, setIsAddingNiche] = useState(false);
  const [newNicheText, setNewNicheText] = useState('');

  // Language selector
  const [selectedLanguage, setSelectedLanguage] = useState('');

  // Target pages
  const [editedTargetPages, setEditedTargetPages] = useState(null);
  const [targetPagesDirty, setTargetPagesDirty] = useState(false);
  const [targetLangFilter, setTargetLangFilter] = useState('');
  const [showSitemapPicker, setShowSitemapPicker] = useState(false);

  // Collapsible sections (all collapsed by default)
  const [collapsedSections, setCollapsedSections] = useState({
    metrics: true,
    niches: true,
    keywords: true,
    backlinks: true,
    anchors: true,
    targetPages: true,
    competitors: true,
    recommendations: true,
  });

  const toggleSection = (key) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Initialise local state from project when it loads
  const keywords =
    editedKeywords ??
    project?.site_analysis?.keywords ??
    project?.keywords ??
    [];
  const anchors =
    editedAnchors ?? project?.anchors ?? project?.site_analysis?.suggested_anchors ?? [];
  const niches =
    editedNiches ??
    project?.niches ??
    (project?.site_analysis?.niches) ??
    (project?.niche ? [project.niche] : []);
  const currentTargetPages =
    editedTargetPages ?? project?.site_analysis?.target_pages ?? [];

  // Sync language selector with detected language
  useEffect(() => {
    if (project?.site_analysis?.language && !selectedLanguage) {
      setSelectedLanguage(project.site_analysis.language);
    }
  }, [project?.site_analysis?.language]);

  // ── Mutations ─────────────────────────────────────────────────────

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeProject(id, selectedLanguage || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success(t('analyzeLaunched'));
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          t('analyzeError')
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success(t('saveSuccess'));
      setKeywordsDirty(false);
      setAnchorsDirty(false);
      setNichesDirty(false);
      setTargetPagesDirty(false);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          t('saveError')
      );
    },
  });

  // ── Keyword helpers ───────────────────────────────────────────────

  const handleKeywordChange = (index, field, value) => {
    const next = [...keywords];
    next[index] = { ...next[index], [field]: value };
    setEditedKeywords(next);
    setKeywordsDirty(true);
  };

  const handleDeleteKeyword = (index) => {
    const next = keywords.filter((_, i) => i !== index);
    setEditedKeywords(next);
    setKeywordsDirty(true);
  };

  const handleAddKeyword = () => {
    const next = [
      ...keywords,
      { keyword: '', intent: 'informational', priority: 'medium', volume: 0 },
    ];
    setEditedKeywords(next);
    setKeywordsDirty(true);
  };

  const handleSaveKeywords = () => {
    updateMutation.mutate({ keywords: editedKeywords ?? keywords });
  };

  // ── Anchor helpers ────────────────────────────────────────────────

  const handleAnchorChange = (index, field, value) => {
    const next = [...anchors];
    next[index] = {
      ...next[index],
      [field]: field === 'weight' ? Number(value) : value,
    };
    setEditedAnchors(next);
    setAnchorsDirty(true);
  };

  const handleDeleteAnchor = (index) => {
    const next = anchors.filter((_, i) => i !== index);
    setEditedAnchors(next);
    setAnchorsDirty(true);
  };

  const handleAddAnchor = () => {
    const next = [
      ...anchors,
      { text: '', type: 'generic', weight: 0 },
    ];
    setEditedAnchors(next);
    setAnchorsDirty(true);
  };

  const handleSaveAnchors = () => {
    updateMutation.mutate({ anchors: editedAnchors ?? anchors });
  };

  const totalWeight = anchors.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);

  // ── Niche helpers ─────────────────────────────────────────────────

  const handleDeleteNiche = (index) => {
    const next = niches.filter((_, i) => i !== index);
    setEditedNiches(next);
    setNichesDirty(true);
  };

  const handleAddNiche = () => {
    const text = newNicheText.trim();
    if (!text) return;
    const next = [...niches, text];
    setEditedNiches(next);
    setNichesDirty(true);
    setNewNicheText('');
    setIsAddingNiche(false);
  };

  const handleSaveNiches = () => {
    updateMutation.mutate({ niches: editedNiches ?? niches });
  };

  // ── Target page helpers ───────────────────────────────────────────

  const handleDeleteTargetPage = (index) => {
    const next = currentTargetPages.filter((_, i) => i !== index);
    setEditedTargetPages(next);
    setTargetPagesDirty(true);
  };

  const handleAddFromSitemap = (sitemapPage) => {
    const next = [
      ...(editedTargetPages ?? currentTargetPages),
      {
        url: sitemapPage.url,
        reason: t('addedFromSitemap'),
        language: sitemapPage.language || 'unknown',
      },
    ];
    setEditedTargetPages(next);
    setTargetPagesDirty(true);
  };

  const handleSaveTargetPages = () => {
    updateMutation.mutate({
      site_analysis: {
        ...(project?.site_analysis ?? {}),
        target_pages: editedTargetPages ?? currentTargetPages,
      },
    });
  };

  // Derive unique languages from target pages for filter tabs
  const targetPageLanguages = [...new Set(
    currentTargetPages.map((p) => p.language).filter(Boolean)
  )];

  const filteredTargetPages = targetLangFilter
    ? currentTargetPages.filter((p) => p.language === targetLangFilter)
    : currentTargetPages;

  // ── Loading / Error states ────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-300">{t('projectNotFound')}</p>
      </div>
    );
  }

  const analysis = project.site_analysis;
  const analysisInProgress = analysis?.status === 'analyzing';
  const hasAnalysis = analysis && !analysisInProgress && analysis.status === 'completed';
  const competitors = analysis?.competitor_domains ?? analysis?.competitors ?? [];
  const contentGaps = analysis?.content_gaps ?? [];
  const backlinkProfile = analysis?.backlink_profile ?? null;

  // ── Analyzing state ───────────────────────────────────────────────

  if (analysisInProgress) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-ink-50 shadow-sm px-6 py-20 text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <h3 className="mt-5 text-lg font-semibold text-ink">
            {t('analyzingTitle')}
          </h3>
          <p className="mt-2 text-sm text-ink-400 max-w-md mx-auto">
            {analysis.progress || t('analyzingDesc')}
          </p>
          <p className="mt-4 text-xs text-ink-200">
            {t('analyzingAutoRefresh')}
          </p>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────

  if (!hasAnalysis) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft px-6 py-20 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-surface-muted">
            <Search className="h-8 w-8 text-ink-200" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-ink">
            {t('noAnalysis')}
          </h3>
          <p className="mt-2 text-sm text-ink-400 max-w-md mx-auto">
            {t('noAnalysisDesc')}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-600 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-200"
            >
              {LANGUAGE_OPTION_KEYS.map((val) => (
                <option key={val} value={val}>
                  {val === '' ? t('langAuto') : val.toUpperCase()}
                </option>
              ))}
            </select>
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="btn-primary"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('analyzingBtn')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {t('analyzeBtn')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <SEOHead pageKey="analysis" />
      {/* Header + language selector + re-analyze */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {t('title')}
          </h1>
          <p className="mt-1.5 text-sm text-ink-400 flex items-center gap-1.5 flex-wrap">
            {t('resultsFor')}{' '}
            <span className="inline-flex items-center gap-1.5 font-medium text-ink-600">
              {analysis.favicon_url && (
                <img
                  src={analysis.favicon_url}
                  alt=""
                  className="h-4 w-4 rounded-sm"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              {project.client_domain}
            </span>
            {(analysis.language || analysis.detected_language) && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                <Globe className="h-3 w-3" />
                {(analysis.language || analysis.detected_language).toUpperCase()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-600 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-200"
          >
            {LANGUAGE_OPTION_KEYS.map((val) => (
              <option key={val} value={val}>
                {val === '' ? t('langAuto') : val.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="btn-primary"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('analyzingBtn')}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t('analyzeBtn')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Domain metrics from DomDetailer ────────────────────────── */}
      {analysis?.domain_metrics && (
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft">
          <button
            onClick={() => toggleSection('metrics')}
            className="w-full px-7 py-5 flex items-center justify-between cursor-pointer hover:bg-surface-muted transition-colors rounded-xl"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              {t('section.metrics')}
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.metrics && 'rotate-180')} />
          </button>
          {!collapsedSections.metrics && <div className="px-7 pb-7">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl p-4 bg-surface-muted border border-ink-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="h-4 w-4 text-brand-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">Domain Rank</p>
              </div>
              <p className="text-2xl font-bold text-ink">{analysis.domain_metrics.domain_rank ?? '--'}</p>
            </div>
            <div className="rounded-xl p-4 bg-surface-muted border border-ink-50">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">URL Rank</p>
              </div>
              <p className="text-2xl font-bold text-ink">{analysis.domain_metrics.url_rank ?? '--'}</p>
            </div>
            <div className="rounded-xl p-4 bg-surface-muted border border-ink-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Link2 className="h-4 w-4 text-violet-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">Backlinks</p>
              </div>
              <p className="text-2xl font-bold text-ink">
                {analysis.domain_metrics.backlinks_count != null
                  ? Number(analysis.domain_metrics.backlinks_count).toLocaleString(i18n.language)
                  : '--'}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-surface-muted border border-ink-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-4 w-4 text-amber-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">Ref. Domains</p>
              </div>
              <p className="text-2xl font-bold text-ink">
                {analysis.domain_metrics.referring_domains != null
                  ? Number(analysis.domain_metrics.referring_domains).toLocaleString(i18n.language)
                  : '--'}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-surface-muted border border-ink-50">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="h-4 w-4 text-rose-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">Dofollow</p>
              </div>
              <p className="text-2xl font-bold text-ink">
                {(() => {
                  const df = Number(analysis.domain_metrics.dofollow_backlinks || 0);
                  const nf = Number(analysis.domain_metrics.nofollow_backlinks || 0);
                  const total = df + nf;
                  return total > 0 ? `${Math.round((df / total) * 100)}%` : '--';
                })()}
              </p>
            </div>
          </div>
          </div>}
        </div>
      )}

      {/* ── Niches ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft">
        <div className="flex items-center justify-between px-7 py-5">
          <button
            onClick={() => toggleSection('niches')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              {t('section.niches')} ({niches.length})
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.niches && 'rotate-180')} />
          </button>
          {nichesDirty && (
            <button
              onClick={handleSaveNiches}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {t('save')}
            </button>
          )}
        </div>
        {!collapsedSections.niches && <div className="px-7 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          {niches.map((niche, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-sm font-semibold text-violet-700"
            >
              {niche}
              <button
                onClick={() => handleDeleteNiche(i)}
                className="rounded-full p-0.5 hover:bg-violet-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {isAddingNiche ? (
            <div className="inline-flex items-center gap-1.5">
              <input
                type="text"
                value={newNicheText}
                onChange={(e) => setNewNicheText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNiche();
                  if (e.key === 'Escape') { setIsAddingNiche(false); setNewNicheText(''); }
                }}
                autoFocus
                placeholder={t('nichePlaceholder')}
                className="rounded-lg border border-violet-200 px-2.5 py-1 text-sm text-ink focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 w-48"
              />
              <button
                onClick={handleAddNiche}
                className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200 transition-all"
              >
                OK
              </button>
              <button
                onClick={() => { setIsAddingNiche(false); setNewNicheText(''); }}
                className="rounded-lg p-1 text-ink-300 hover:text-ink-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingNiche(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-500 hover:bg-violet-50 hover:border-violet-400 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('addNiche')}
            </button>
          )}
        </div>
        {niches.length === 0 && !isAddingNiche && (
          <p className="mt-2 text-xs text-ink-300">
            {t('noNichesDesc')}
          </p>
        )}
        </div>}
      </div>

      {/* ── Keywords table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft overflow-hidden">
        <div className="px-7 py-5 border-b border-cream-200 flex items-center justify-between">
          <button
            onClick={() => toggleSection('keywords')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <h2 className="text-base font-bold text-ink">
              {t('section.keywords')} ({keywords.length})
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.keywords && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            {keywordsDirty && (
              <button
                onClick={handleSaveKeywords}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {t('save')}
              </button>
            )}
            {!collapsedSections.keywords && (
              <button
                onClick={handleAddKeyword}
                className="btn-secondary text-xs py-2"
              >
                <Plus className="h-3 w-3" />
                {t('addKeyword')}
              </button>
            )}
          </div>
        </div>

        {!collapsedSections.keywords && (keywords.length === 0 ? (
          <div className="px-7 py-10 text-center text-sm text-ink-400">
            {t('keywordsEmpty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-50/50 text-left">
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('keyword')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('intent')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('priorityLabel')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('volumeEstimate')}</th>
                  <th className="px-7 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {keywords.map((kw, i) => (
                  <tr
                    key={i}
                    className="hover:bg-brand-50/40 transition-colors duration-150 group"
                  >
                    <td className="px-7 py-3.5">
                      <input
                        type="text"
                        value={kw.keyword ?? ''}
                        onChange={(e) =>
                          handleKeywordChange(i, 'keyword', e.target.value)
                        }
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-ink focus:border-brand-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-200 hover:border-ink-100 transition-all"
                        placeholder={t('keywordPlaceholder')}
                      />
                    </td>
                    <td className="px-7 py-3.5">
                      <select
                        value={kw.intent ?? 'informational'}
                        onChange={(e) =>
                          handleKeywordChange(i, 'intent', e.target.value)
                        }
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-200',
                          INTENTION_BADGE[kw.intent] ?? INTENTION_BADGE.informational
                        )}
                      >
                        {Object.keys(INTENTION_BADGE).map((val) => (
                          <option key={val} value={val}>
                            {t(`intention.${val}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-7 py-3.5">
                      <select
                        value={kw.priority ?? 'medium'}
                        onChange={(e) =>
                          handleKeywordChange(i, 'priority', e.target.value)
                        }
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-200',
                          PRIORITY_BADGE[kw.priority] ?? PRIORITY_BADGE.medium
                        )}
                      >
                        {Object.keys(PRIORITY_BADGE).map((val) => (
                          <option key={val} value={val}>
                            {t(`priority.${val}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-7 py-3.5">
                      <input
                        type="number"
                        min={0}
                        value={kw.volume ?? 0}
                        onChange={(e) =>
                          handleKeywordChange(i, 'volume', Number(e.target.value))
                        }
                        className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-ink focus:border-brand-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-200 hover:border-ink-100 transition-all"
                      />
                    </td>
                    <td className="px-7 py-3.5">
                      <button
                        onClick={() => handleDeleteKeyword(i)}
                        className="rounded-lg p-1.5 text-ink-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ── Backlink profile summary ─────────────────────────────── */}
      {backlinkProfile && backlinkProfile.total > 0 && (
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft">
          <button
            onClick={() => toggleSection('backlinks')}
            className="w-full px-7 py-5 flex items-center justify-between cursor-pointer hover:bg-surface-muted transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-ink-300" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                {t('backlinkProfileTitle')} ({backlinkProfile.total} backlinks)
              </h2>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.backlinks && 'rotate-180')} />
          </button>
          {!collapsedSections.backlinks && <div className="px-7 pb-7">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(backlinkProfile.distribution || {}).map(([type, pct]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-ink">
                  {typeof pct === 'number' ? pct.toFixed(0) : pct}%
                </div>
                <div className="mt-1 text-xs text-ink-400">
                  {t(`backlinkDist.${type}`)}
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-cream-50">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      type === 'brand' ? 'bg-brand-400' :
                      type === 'keyword_based' ? 'bg-red-400' :
                      type === 'generic' ? 'bg-ink-300' :
                      'bg-violet-400'
                    )}
                    style={{ width: `${Math.min(Number(pct) || 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          </div>}
        </div>
      )}

      {/* ── Anchors table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft overflow-hidden">
        <div className="px-7 py-5 border-b border-cream-200 flex items-center justify-between">
          <button
            onClick={() => toggleSection('anchors')}
            className="flex items-center gap-4 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">
                {t('section.anchors')} ({anchors.length})
              </h2>
              <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.anchors && 'rotate-180')} />
            </div>
            <span
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full',
                totalWeight === 100
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-amber-50 text-amber-700'
              )}
            >
              {t('totalWeightBadge', { weight: totalWeight })}
              {totalWeight !== 100 && t('totalWeightMust100')}
            </span>
          </button>
          <div className="flex items-center gap-2">
            {anchorsDirty && (
              <button
                onClick={handleSaveAnchors}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {t('save')}
              </button>
            )}
            {!collapsedSections.anchors && (
              <button
                onClick={handleAddAnchor}
                className="btn-secondary text-xs py-2"
              >
                <Plus className="h-3 w-3" />
                {t('addAnchor')}
              </button>
            )}
          </div>
        </div>

        {!collapsedSections.anchors && (anchors.length === 0 ? (
          <div className="px-7 py-10 text-center text-sm text-ink-400">
            {t('anchorsEmpty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-50/50 text-left">
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('anchorText')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('type')}</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('anchorWeightPercent')}</th>
                  <th className="px-7 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {anchors.map((anchor, i) => (
                  <tr
                    key={i}
                    className="hover:bg-brand-50/40 transition-colors duration-150 group"
                  >
                    <td className="px-7 py-3.5">
                      <input
                        type="text"
                        value={anchor.text ?? ''}
                        onChange={(e) =>
                          handleAnchorChange(i, 'text', e.target.value)
                        }
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-ink focus:border-brand-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-200 hover:border-ink-100 transition-all"
                        placeholder={t('anchorTextPlaceholder')}
                      />
                    </td>
                    <td className="px-7 py-3.5">
                      <select
                        value={anchor.type ?? 'generic'}
                        onChange={(e) =>
                          handleAnchorChange(i, 'type', e.target.value)
                        }
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-200',
                          ANCHOR_TYPE_BADGE[anchor.type] ?? ANCHOR_TYPE_BADGE.generic
                        )}
                      >
                        {Object.keys(ANCHOR_TYPE_BADGE).map((val) => (
                          <option key={val} value={val}>
                            {t(`anchorType.${val}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-7 py-3.5">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={anchor.weight ?? 0}
                          onChange={(e) =>
                            handleAnchorChange(i, 'weight', e.target.value)
                          }
                          className="w-16 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-ink focus:border-brand-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-200 hover:border-ink-100 transition-all"
                        />
                        <div className="flex-1 min-w-[80px]">
                          <div className="h-2 w-full rounded-full bg-cream-50">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                (Number(anchor.weight) || 0) > 30
                                  ? 'bg-brand-500'
                                  : (Number(anchor.weight) || 0) > 15
                                    ? 'bg-brand-400'
                                    : 'bg-brand-300'
                              )}
                              style={{
                                width: `${Math.min(Number(anchor.weight) || 0, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-7 py-3.5">
                      <button
                        onClick={() => handleDeleteAnchor(i)}
                        className="rounded-lg p-1.5 text-ink-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ── Target pages ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft overflow-hidden">
        <div className="px-7 py-5 border-b border-cream-200 flex items-center justify-between">
          <button
            onClick={() => toggleSection('targetPages')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <h2 className="text-base font-bold text-ink">
              {t('section.targetPages')} ({currentTargetPages.length})
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.targetPages && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            {targetPagesDirty && (
              <button
                onClick={handleSaveTargetPages}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {t('save')}
              </button>
            )}
            {!collapsedSections.targetPages && (
              <button
                onClick={() => setShowSitemapPicker(true)}
                className="btn-secondary text-xs py-2"
              >
                <Globe className="h-3 w-3" />
                {t('addFromSitemap')}
              </button>
            )}
          </div>
        </div>

        {!collapsedSections.targetPages && (<>
        {/* Language filter tabs */}
        {targetPageLanguages.length > 1 && (
          <div className="px-7 py-3 border-b border-ink-50/50 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTargetLangFilter('')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                !targetLangFilter
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-surface-muted text-ink-400 hover:bg-cream-50'
              )}
            >
              {t('allPages', { count: currentTargetPages.length })}
            </button>
            {targetPageLanguages.map((lang) => {
              const count = currentTargetPages.filter((p) => p.language === lang).length;
              return (
                <button
                  key={lang}
                  onClick={() => setTargetLangFilter(lang)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-all',
                    targetLangFilter === lang
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-surface-muted text-ink-400 hover:bg-cream-50'
                  )}
                >
                  {lang.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        )}

        {currentTargetPages.length === 0 ? (
          <div className="px-7 py-10 text-center text-sm text-ink-400">
            {t('targetPagesEmpty')}
          </div>
        ) : (
          <ul className="divide-y divide-ink-50">
            {filteredTargetPages.map((page, i) => {
              const realIndex = currentTargetPages.indexOf(page);
              return (
                <li
                  key={realIndex}
                  className="px-7 py-4 hover:bg-brand-50/40 transition-colors duration-150 flex items-start justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {page.language && page.language !== 'unknown' && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 uppercase flex-shrink-0">
                          {page.language}
                        </span>
                      )}
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors truncate"
                      >
                        {page.url}
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                    </div>
                    {page.reason && (
                      <p className="mt-1 text-xs text-ink-300">{page.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTargetPage(realIndex)}
                    className="rounded-lg p-1.5 text-ink-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        </>)}
      </div>

      {/* ── Competitors ────────────────────────────────────────────── */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft overflow-hidden">
          <div className="px-7 py-5 border-b border-cream-200">
            <button
              onClick={() => toggleSection('competitors')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <h2 className="text-base font-bold text-ink">
                {t('section.competitors')} ({competitors.length})
              </h2>
              <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.competitors && 'rotate-180')} />
            </button>
          </div>
          {!collapsedSections.competitors && (
          <ul className="divide-y divide-ink-50">
            {competitors.map((competitor, i) => {
              const domain =
                typeof competitor === 'string' ? competitor : competitor.domain;
              return (
                <li
                  key={i}
                  className="px-7 py-4 hover:bg-brand-50/40 transition-colors duration-150 flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {domain}
                  </span>
                  <a
                    href={`https://${domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-ink-200 hover:text-brand-500 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </li>
              );
            })}
          </ul>
          )}
        </div>
      )}

      {/* ── Recommendations ──────────────────────────────────────── */}
      {contentGaps.length > 0 && (
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft overflow-hidden">
          <div className="px-7 py-5 border-b border-cream-200">
            <button
              onClick={() => toggleSection('recommendations')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <h2 className="text-base font-bold text-ink">
                {t('section.recommendations')} ({contentGaps.length})
              </h2>
              <ChevronDown className={cn('h-4 w-4 text-ink-300 transition-transform duration-200', !collapsedSections.recommendations && 'rotate-180')} />
            </button>
          </div>
          {!collapsedSections.recommendations && (
          <ul className="divide-y divide-ink-50">
            {contentGaps.map((gap, i) => {
              const isObject = typeof gap === 'object' && gap !== null;
              const text = isObject ? (gap.suggestion ?? gap.topic ?? '') : String(gap);
              const type = isObject ? gap.type : null;
              const priority = isObject ? gap.priority : null;
              return (
                <li
                  key={i}
                  className="px-7 py-4 hover:bg-brand-50/40 transition-colors duration-150 flex items-start gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {(type || priority) && (
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {type && (
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            RECO_TYPE_BADGE[type] ?? 'bg-surface-muted text-ink-500'
                          )}>
                            {t(`recoType.${type}`)}
                          </span>
                        )}
                        {priority && (
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            PRIORITY_BADGE[priority] ?? 'bg-surface-muted text-ink-500'
                          )}>
                            {t(`priority.${priority}`)}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-sm text-ink-600">{text}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          )}
        </div>
      )}

      {/* ── Sitemap Picker Modal ───────────────────────────────────── */}
      {showSitemapPicker && (
        <SitemapPickerModal
          projectId={id}
          existingUrls={currentTargetPages.map((p) => p.url)}
          onAdd={handleAddFromSitemap}
          onClose={() => setShowSitemapPicker(false)}
        />
      )}
    </div>
  );
}
