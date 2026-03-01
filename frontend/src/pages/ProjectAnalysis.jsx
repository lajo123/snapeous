import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getProject, analyzeProject, updateProject, getSitemapPages } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
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
  transactional: 'bg-emerald-50 text-emerald-700',
  commercial: 'bg-violet-50 text-violet-700',
  navigational: 'bg-gray-50 text-gray-600',
};

const INTENTION_LABEL = {
  informational: 'Informationnel',
  transactional: 'Transactionnel',
  commercial: 'Commercial',
  navigational: 'Navigationnel',
};

const PRIORITY_BADGE = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-50 text-gray-600',
};

const PRIORITY_LABEL = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

const ANCHOR_TYPE_BADGE = {
  exact: 'bg-red-50 text-red-700',
  partial: 'bg-blue-50 text-blue-700',
  optimized: 'bg-red-50 text-red-700',
  semi_optimized: 'bg-blue-50 text-blue-700',
  brand: 'bg-emerald-50 text-emerald-700',
  generic: 'bg-gray-50 text-gray-600',
  naked_url: 'bg-violet-50 text-violet-700',
};

const ANCHOR_TYPE_LABEL = {
  exact: 'Exact',
  partial: 'Partiel',
  optimized: 'Optimise',
  semi_optimized: 'Semi-optimise',
  brand: 'Marque',
  generic: 'Generique',
  naked_url: 'URL nue',
};

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Auto' },
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'de', label: 'DE' },
  { value: 'it', label: 'IT' },
  { value: 'pt', label: 'PT' },
  { value: 'nl', label: 'NL' },
];

const LANG_LABEL = {
  fr: 'Francais',
  en: 'Anglais',
  es: 'Espagnol',
  de: 'Allemand',
  it: 'Italien',
  pt: 'Portugais',
  nl: 'Neerlandais',
  unknown: 'Autre',
};

const RECO_TYPE_BADGE = {
  content: 'bg-blue-50 text-blue-700',
  link_type: 'bg-violet-50 text-violet-700',
  anchor_strategy: 'bg-amber-50 text-amber-700',
  page_priority: 'bg-emerald-50 text-emerald-700',
};

const RECO_TYPE_LABEL = {
  content: 'Contenu',
  link_type: 'Type de lien',
  anchor_strategy: "Strategie d'ancres",
  page_priority: 'Pages prioritaires',
};

// ── Sitemap Picker Modal ─────────────────────────────────────────────

function SitemapPickerModal({ projectId, existingUrls, onAdd, onClose }) {
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
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">
            Ajouter depuis le sitemap
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Language tabs + search */}
        <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setLangFilter(''); setPage(1); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all',
              !langFilter
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            )}
          >
            Toutes
          </button>
          {Object.entries(languages).map(([lang, count]) => (
            <button
              key={lang}
              onClick={() => { setLangFilter(lang); setPage(1); }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                langFilter === lang
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
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
              placeholder="Filtrer les URLs..."
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200 w-56"
            />
          </div>
        </div>

        {/* Pages list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {pages.length === 0
                ? 'Aucune page trouvee dans le sitemap.'
                : 'Aucune page ne correspond au filtre.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((p, i) => {
                const alreadyAdded = existingSet.has(p.url);
                return (
                  <li
                    key={i}
                    className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-emerald-50/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {p.language && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 uppercase flex-shrink-0">
                          {p.language}
                        </span>
                      )}
                      <span className="text-sm text-gray-700 truncate">
                        {p.url}
                      </span>
                    </div>
                    <button
                      onClick={() => !alreadyAdded && onAdd(p)}
                      disabled={alreadyAdded}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex-shrink-0',
                        alreadyAdded
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      )}
                    >
                      {alreadyAdded ? 'Ajoutee' : '+ Ajouter'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Precedent
            </button>
            <span className="text-xs text-gray-400">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Suivant
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
      toast.success('Analyse lancee ! Cela peut prendre 1-2 minutes...');
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Erreur lors de l'analyse du site"
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Modifications enregistrees');
      setKeywordsDirty(false);
      setAnchorsDirty(false);
      setNichesDirty(false);
      setTargetPagesDirty(false);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Erreur lors de la sauvegarde'
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
        reason: 'Ajoutee depuis le sitemap',
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
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Projet introuvable.</p>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-20 text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <h3 className="mt-5 text-lg font-semibold text-gray-900">
            Analyse en cours...
          </h3>
          <p className="mt-2 text-sm text-[#6b6560] max-w-md mx-auto">
            {analysis.progress || "Le site est en cours de crawl et d'analyse par l'IA. Cela peut prendre 1-2 minutes."}
          </p>
          <p className="mt-4 text-xs text-gray-300">
            Cette page se rafraichit automatiquement.
          </p>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────

  if (!hasAnalysis) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft px-6 py-20 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-gray-50">
            <Search className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-gray-900">
            Aucune analyse disponible
          </h3>
          <p className="mt-2 text-sm text-[#6b6560] max-w-md mx-auto">
            Lancez une analyse de votre site pour obtenir des recommandations de
            mots-cles, d'ancres, de pages cibles et de concurrents.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analyser le site
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
      {/* Header + language selector + re-analyze */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Analyse du site
          </h1>
          <p className="mt-1.5 text-sm text-[#6b6560] flex items-center gap-1.5 flex-wrap">
            Resultats de l'analyse pour{' '}
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700">
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
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
                Analyse en cours...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Analyser le site
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Domain metrics from DomDetailer ────────────────────────── */}
      {analysis?.domain_metrics && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft">
          <button
            onClick={() => toggleSection('metrics')}
            className="w-full px-7 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors rounded-xl"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Métriques du domaine
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.metrics && 'rotate-180')} />
          </button>
          {!collapsedSections.metrics && <div className="px-7 pb-7">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl p-4 bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="h-4 w-4 text-emerald-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Domain Rank</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analysis.domain_metrics.domain_rank ?? '--'}</p>
            </div>
            <div className="rounded-xl p-4 bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">URL Rank</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analysis.domain_metrics.url_rank ?? '--'}</p>
            </div>
            <div className="rounded-xl p-4 bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Link2 className="h-4 w-4 text-violet-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Backlinks</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.domain_metrics.backlinks_count != null
                  ? Number(analysis.domain_metrics.backlinks_count).toLocaleString('fr-FR')
                  : '--'}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-4 w-4 text-amber-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Ref. Domains</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.domain_metrics.referring_domains != null
                  ? Number(analysis.domain_metrics.referring_domains).toLocaleString('fr-FR')
                  : '--'}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="h-4 w-4 text-rose-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Dofollow</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft">
        <div className="flex items-center justify-between px-7 py-5">
          <button
            onClick={() => toggleSection('niches')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Niches ({niches.length})
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.niches && 'rotate-180')} />
          </button>
          {nichesDirty && (
            <button
              onClick={handleSaveNiches}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Enregistrer
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
                placeholder="Nom de la niche..."
                className="rounded-lg border border-violet-200 px-2.5 py-1 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 w-48"
              />
              <button
                onClick={handleAddNiche}
                className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200 transition-all"
              >
                OK
              </button>
              <button
                onClick={() => { setIsAddingNiche(false); setNewNicheText(''); }}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
              Ajouter
            </button>
          )}
        </div>
        {niches.length === 0 && !isAddingNiche && (
          <p className="mt-2 text-xs text-gray-400">
            Aucune niche detectee. Relancez l'analyse ou ajoutez manuellement.
          </p>
        )}
        </div>}
      </div>

      {/* ── Keywords table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
        <div className="px-7 py-5 border-b border-[#EDE4D3] flex items-center justify-between">
          <button
            onClick={() => toggleSection('keywords')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <h2 className="text-base font-bold text-gray-900">
              Mots-cles ({keywords.length})
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.keywords && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            {keywordsDirty && (
              <button
                onClick={handleSaveKeywords}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Enregistrer
              </button>
            )}
            {!collapsedSections.keywords && (
              <button
                onClick={handleAddKeyword}
                className="btn-secondary text-xs py-2"
              >
                <Plus className="h-3 w-3" />
                Ajouter un keyword
              </button>
            )}
          </div>
        </div>

        {!collapsedSections.keywords && (keywords.length === 0 ? (
          <div className="px-7 py-10 text-center text-sm text-[#6b6560]">
            Aucun mot-cle. Cliquez sur "Ajouter un keyword" pour commencer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Mot-cle</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Intention</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Priorite</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Volume estime</th>
                  <th className="px-7 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {keywords.map((kw, i) => (
                  <tr
                    key={i}
                    className="hover:bg-emerald-50/40 transition-colors duration-150 group"
                  >
                    <td className="px-7 py-3.5">
                      <input
                        type="text"
                        value={kw.keyword ?? ''}
                        onChange={(e) =>
                          handleKeywordChange(i, 'keyword', e.target.value)
                        }
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 focus:border-emerald-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-200 hover:border-gray-200 transition-all"
                        placeholder="Mot-cle..."
                      />
                    </td>
                    <td className="px-7 py-3.5">
                      <select
                        value={kw.intent ?? 'informational'}
                        onChange={(e) =>
                          handleKeywordChange(i, 'intent', e.target.value)
                        }
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-200',
                          INTENTION_BADGE[kw.intent] ?? INTENTION_BADGE.informational
                        )}
                      >
                        {Object.entries(INTENTION_LABEL).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
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
                          'rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-200',
                          PRIORITY_BADGE[kw.priority] ?? PRIORITY_BADGE.medium
                        )}
                      >
                        {Object.entries(PRIORITY_LABEL).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
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
                        className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 focus:border-emerald-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-200 hover:border-gray-200 transition-all"
                      />
                    </td>
                    <td className="px-7 py-3.5">
                      <button
                        onClick={() => handleDeleteKeyword(i)}
                        className="rounded-lg p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                        title="Supprimer"
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft">
          <button
            onClick={() => toggleSection('backlinks')}
            className="w-full px-7 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-gray-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Profil de backlinks actuel ({backlinkProfile.total} backlinks)
              </h2>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.backlinks && 'rotate-180')} />
          </button>
          {!collapsedSections.backlinks && <div className="px-7 pb-7">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(backlinkProfile.distribution || {}).map(([type, pct]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {typeof pct === 'number' ? pct.toFixed(0) : pct}%
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {type === 'brand' && 'Marque'}
                  {type === 'naked_url' && 'URL nue'}
                  {type === 'generic' && 'Generique'}
                  {type === 'keyword_based' && 'Mot-cle'}
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      type === 'brand' ? 'bg-emerald-400' :
                      type === 'keyword_based' ? 'bg-red-400' :
                      type === 'generic' ? 'bg-gray-400' :
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
        <div className="px-7 py-5 border-b border-[#EDE4D3] flex items-center justify-between">
          <button
            onClick={() => toggleSection('anchors')}
            className="flex items-center gap-4 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">
                Ancres ({anchors.length})
              </h2>
              <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.anchors && 'rotate-180')} />
            </div>
            <span
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full',
                totalWeight === 100
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              )}
            >
              Total : {totalWeight}%
              {totalWeight !== 100 && ' (doit faire 100%)'}
            </span>
          </button>
          <div className="flex items-center gap-2">
            {anchorsDirty && (
              <button
                onClick={handleSaveAnchors}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Enregistrer
              </button>
            )}
            {!collapsedSections.anchors && (
              <button
                onClick={handleAddAnchor}
                className="btn-secondary text-xs py-2"
              >
                <Plus className="h-3 w-3" />
                Ajouter une ancre
              </button>
            )}
          </div>
        </div>

        {!collapsedSections.anchors && (anchors.length === 0 ? (
          <div className="px-7 py-10 text-center text-sm text-[#6b6560]">
            Aucune ancre. Cliquez sur "Ajouter une ancre" pour commencer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Texte d'ancre</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Type</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Poids (%)</th>
                  <th className="px-7 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {anchors.map((anchor, i) => (
                  <tr
                    key={i}
                    className="hover:bg-emerald-50/40 transition-colors duration-150 group"
                  >
                    <td className="px-7 py-3.5">
                      <input
                        type="text"
                        value={anchor.text ?? ''}
                        onChange={(e) =>
                          handleAnchorChange(i, 'text', e.target.value)
                        }
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 focus:border-emerald-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-200 hover:border-gray-200 transition-all"
                        placeholder="Texte d'ancre..."
                      />
                    </td>
                    <td className="px-7 py-3.5">
                      <select
                        value={anchor.type ?? 'generic'}
                        onChange={(e) =>
                          handleAnchorChange(i, 'type', e.target.value)
                        }
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-200',
                          ANCHOR_TYPE_BADGE[anchor.type] ?? ANCHOR_TYPE_BADGE.generic
                        )}
                      >
                        {Object.entries(ANCHOR_TYPE_LABEL).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
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
                          className="w-16 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 focus:border-emerald-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-200 hover:border-gray-200 transition-all"
                        />
                        <div className="flex-1 min-w-[80px]">
                          <div className="h-2 w-full rounded-full bg-gray-100">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                (Number(anchor.weight) || 0) > 30
                                  ? 'bg-emerald-500'
                                  : (Number(anchor.weight) || 0) > 15
                                    ? 'bg-emerald-400'
                                    : 'bg-emerald-300'
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
                        className="rounded-lg p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                        title="Supprimer"
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
        <div className="px-7 py-5 border-b border-[#EDE4D3] flex items-center justify-between">
          <button
            onClick={() => toggleSection('targetPages')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <h2 className="text-base font-bold text-gray-900">
              Pages cibles ({currentTargetPages.length})
            </h2>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.targetPages && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            {targetPagesDirty && (
              <button
                onClick={handleSaveTargetPages}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Enregistrer
              </button>
            )}
            {!collapsedSections.targetPages && (
              <button
                onClick={() => setShowSitemapPicker(true)}
                className="btn-secondary text-xs py-2"
              >
                <Globe className="h-3 w-3" />
                Ajouter depuis le sitemap
              </button>
            )}
          </div>
        </div>

        {!collapsedSections.targetPages && (<>
        {/* Language filter tabs */}
        {targetPageLanguages.length > 1 && (
          <div className="px-7 py-3 border-b border-gray-50 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTargetLangFilter('')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                !targetLangFilter
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              )}
            >
              Toutes ({currentTargetPages.length})
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
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {lang.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        )}

        {currentTargetPages.length === 0 ? (
          <div className="px-7 py-10 text-center text-sm text-[#6b6560]">
            Aucune page cible. Utilisez "Ajouter depuis le sitemap" pour commencer.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredTargetPages.map((page, i) => {
              const realIndex = currentTargetPages.indexOf(page);
              return (
                <li
                  key={realIndex}
                  className="px-7 py-4 hover:bg-emerald-50/40 transition-colors duration-150 flex items-start justify-between gap-4 group"
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
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors truncate"
                      >
                        {page.url}
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                    </div>
                    {page.reason && (
                      <p className="mt-1 text-xs text-gray-400">{page.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTargetPage(realIndex)}
                    className="rounded-lg p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all flex-shrink-0"
                    title="Supprimer"
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
          <div className="px-7 py-5 border-b border-[#EDE4D3]">
            <button
              onClick={() => toggleSection('competitors')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <h2 className="text-base font-bold text-gray-900">
                Concurrents ({competitors.length})
              </h2>
              <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.competitors && 'rotate-180')} />
            </button>
          </div>
          {!collapsedSections.competitors && (
          <ul className="divide-y divide-gray-50">
            {competitors.map((competitor, i) => {
              const domain =
                typeof competitor === 'string' ? competitor : competitor.domain;
              return (
                <li
                  key={i}
                  className="px-7 py-4 hover:bg-emerald-50/40 transition-colors duration-150 flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {domain}
                  </span>
                  <a
                    href={`https://${domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-gray-300 hover:text-emerald-500 transition-colors"
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
          <div className="px-7 py-5 border-b border-[#EDE4D3]">
            <button
              onClick={() => toggleSection('recommendations')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <h2 className="text-base font-bold text-gray-900">
                Recommandations ({contentGaps.length})
              </h2>
              <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', !collapsedSections.recommendations && 'rotate-180')} />
            </button>
          </div>
          {!collapsedSections.recommendations && (
          <ul className="divide-y divide-gray-50">
            {contentGaps.map((gap, i) => {
              const isObject = typeof gap === 'object' && gap !== null;
              const text = isObject ? (gap.suggestion ?? gap.topic ?? '') : String(gap);
              const type = isObject ? gap.type : null;
              const priority = isObject ? gap.priority : null;
              return (
                <li
                  key={i}
                  className="px-7 py-4 hover:bg-emerald-50/40 transition-colors duration-150 flex items-start gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {(type || priority) && (
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {type && RECO_TYPE_LABEL[type] && (
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            RECO_TYPE_BADGE[type] ?? 'bg-gray-50 text-gray-600'
                          )}>
                            {RECO_TYPE_LABEL[type]}
                          </span>
                        )}
                        {priority && PRIORITY_LABEL[priority] && (
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            PRIORITY_BADGE[priority] ?? 'bg-gray-50 text-gray-600'
                          )}>
                            {PRIORITY_LABEL[priority]}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-sm text-gray-700">{text}</span>
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
