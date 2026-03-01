import { useState, useMemo, useCallback, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  getSpots,
  getSpotsCount,
  updateSpot,
  qualifySpot,
  deleteSpot,
  exportSpots,
  bulkUpdateSpots,
  verifySpot,
  getProject,
  getFootprints,
  getFootprintCategories,
  getSearches,
  createSearch,
} from '@/lib/api';
import {
  cn,
  truncateUrl,
  formatDate,
  SPOT_STATUS_LABELS,
  SPOT_STATUS_COLORS,
  LINK_TYPE_LABELS,
  CATEGORY_LABELS,
  SEARCH_STATUS_LABELS,
  SEARCH_STATUS_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from '@/lib/utils';
import {
  ArrowLeft,
  ExternalLink,
  Filter,
  Download,
  RefreshCw,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Search,
  Loader2,
  ChevronDown,
  CheckSquare,
  Square,
  Target,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const SPOT_TYPES = [
  { value: 'blog', label: 'Blog' },
  { value: 'forum', label: 'Forum' },
  { value: 'directory', label: 'Annuaire' },
  { value: 'guestbook', label: "Livre d'or" },
  { value: 'wiki', label: 'Wiki' },
  { value: 'social', label: 'Social' },
  { value: 'news', label: 'Actualites' },
  { value: 'other', label: 'Autre' },
];

const SPOT_TYPE_LABELS = Object.fromEntries(
  SPOT_TYPES.map((t) => [t.value, t.label])
);

const SPOT_TYPE_COLORS = {
  blog: 'bg-blue-50 text-blue-700',
  forum: 'bg-violet-50 text-violet-700',
  directory: 'bg-emerald-50 text-emerald-700',
  guestbook: 'bg-amber-50 text-amber-700',
  wiki: 'bg-cyan-50 text-cyan-700',
  social: 'bg-indigo-50 text-indigo-700',
  news: 'bg-emerald-50 text-emerald-700',
  other: 'bg-gray-50 text-gray-600',
};

const SORT_OPTIONS = [
  { value: 'quality_score', label: 'Score qualite' },
  { value: 'da', label: 'DA' },
  { value: 'created_at', label: 'Date de decouverte' },
];

const DEFAULT_FILTERS = {
  status: '',
  type: '',
  platform: '',
  dofollow_only: false,
  has_form: false,
  da_min: '',
  sort_by: 'quality_score',
};

// ── Component ──────────────────────────────────────────────────────────

export default function ProjectSpots() {
  const { id: project_id } = useParams();
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState('spots'); // 'spots' | 'search'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedSpotId, setExpandedSpotId] = useState(null);
  const [editNotes, setEditNotes] = useState('');

  // Search tab state
  const [selectedFootprints, setSelectedFootprints] = useState(new Set());
  const [selectedKeywords, setSelectedKeywords] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // ── Build query params ─────────────────────────────────────────────

  const queryParams = useMemo(() => {
    const params = {
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort_by: filters.sort_by || 'quality_score',
    };
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.platform) params.platform = filters.platform;
    if (filters.dofollow_only) params.dofollow_only = true;
    if (filters.has_form) params.has_form = true;
    if (filters.da_min !== '' && filters.da_min !== undefined) {
      const n = Number(filters.da_min);
      if (!isNaN(n) && n > 0) params.da_min = n;
    }
    return params;
  }, [filters, page]);

  // ── Queries ────────────────────────────────────────────────────────

  const {
    data: spots = [],
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ['spots', project_id, queryParams],
    queryFn: () => getSpots(project_id, queryParams),
    keepPreviousData: true,
  });

  const { data: countsData } = useQuery({
    queryKey: ['spots-count', project_id],
    queryFn: () => getSpotsCount(project_id),
  });

  // ── Search queries ────────────────────────────────────────────────

  const { data: project } = useQuery({
    queryKey: ['project', project_id],
    queryFn: () => getProject(project_id),
    enabled: activeTab === 'search',
  });

  const { data: footprints = [] } = useQuery({
    queryKey: ['footprints'],
    queryFn: () => getFootprints(),
    enabled: activeTab === 'search',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['footprint-categories'],
    queryFn: () => getFootprintCategories(),
    enabled: activeTab === 'search',
  });

  const { data: searches = [] } = useQuery({
    queryKey: ['searches', project_id],
    queryFn: () => getSearches(project_id),
    enabled: activeTab === 'search',
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !Array.isArray(data)) return false;
      const hasActive = data.some(
        (s) => s.status === 'pending' || s.status === 'running'
      );
      return hasActive ? 3000 : false;
    },
  });

  // ── Search derived data ───────────────────────────────────────────

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

  // ── Mutations ──────────────────────────────────────────────────────

  const invalidateSpots = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['spots', project_id] });
    queryClient.invalidateQueries({ queryKey: ['spots-count', project_id] });
  }, [queryClient, project_id]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSpot(id, data),
    onSuccess: () => {
      invalidateSpots();
      toast.success('Spot mis a jour');
    },
    onError: () => toast.error('Erreur lors de la mise a jour'),
  });

  const qualifyMutation = useMutation({
    mutationFn: (id) => qualifySpot(id),
    onSuccess: () => {
      invalidateSpots();
      toast.success('Spot requalifie');
    },
    onError: () => toast.error('Erreur lors de la requalification'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSpot(id),
    onSuccess: () => {
      invalidateSpots();
      setExpandedSpotId(null);
      toast.success('Spot supprime');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, status }) => bulkUpdateSpots(ids, status),
    onSuccess: () => {
      invalidateSpots();
      setSelectedIds(new Set());
      toast.success('Spots mis a jour en masse');
    },
    onError: () => toast.error('Erreur lors de la mise a jour en masse'),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, isRelevant, reason }) => verifySpot(id, isRelevant, reason),
    onSuccess: (data) => {
      invalidateSpots();
      toast.success(data.detail || 'Spot verifie');
    },
    onError: () => toast.error('Erreur lors de la verification'),
  });

  const searchMutation = useMutation({
    mutationFn: (data) => createSearch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches', project_id] });
      queryClient.invalidateQueries({ queryKey: ['project', project_id] });
      toast.success(`Recherche lancée — ${totalQueries} requête(s) créée(s)`);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Erreur lors du lancement de la recherche'
      );
    },
  });

  // ── Stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!countsData) return null;
    return countsData;
  }, [countsData]);

  const totalCount = stats?.total ?? spots.length;

  // ── Search handlers ────────────────────────────────────────────────

  const toggleSearchCategory = useCallback((cat) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleSearchCategoryAll = useCallback((cat) => {
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
  }, [footprintsByCategory, selectedFootprints]);

  const toggleFootprint = useCallback((fpId) => {
    setSelectedFootprints((prev) => {
      const next = new Set(prev);
      if (next.has(fpId)) next.delete(fpId);
      else next.add(fpId);
      return next;
    });
  }, []);

  const toggleKeyword = useCallback((kw) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  }, []);

  const toggleAllKeywords = useCallback(() => {
    if (selectedKeywords.size === keywords.length) {
      setSelectedKeywords(new Set());
    } else {
      setSelectedKeywords(new Set(keywords));
    }
  }, [selectedKeywords.size, keywords]);

  const handleLaunchSearch = useCallback(() => {
    if (totalQueries === 0) return;
    const confirmed = window.confirm(
      `Cela va lancer ${totalQueries} requêtes Google. Continuer ?`
    );
    if (!confirmed) return;
    searchMutation.mutate({
      project_id,
      footprint_ids: Array.from(selectedFootprints),
      keywords: Array.from(selectedKeywords),
    });
  }, [totalQueries, searchMutation, project_id, selectedFootprints, selectedKeywords]);

  // ── Spot handlers ─────────────────────────────────────────────────

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
    setSelectedIds(new Set());
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === spots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(spots.map((s) => s.id)));
    }
  }, [selectedIds.size, spots]);

  const handleBulkSelect = useCallback(() => {
    if (selectedIds.size === 0) return;
    bulkMutation.mutate({ ids: Array.from(selectedIds), status: 'selected' });
  }, [selectedIds, bulkMutation]);

  const handleBulkReject = useCallback(() => {
    if (selectedIds.size === 0) return;
    bulkMutation.mutate({ ids: Array.from(selectedIds), status: 'rejected' });
  }, [selectedIds, bulkMutation]);

  const handleExport = useCallback(() => {
    exportSpots(project_id, queryParams)
      .then(() => toast.success('Export CSV telecharge'))
      .catch(() => toast.error("Erreur lors de l'export"));
  }, [project_id, queryParams]);

  const handleRefresh = useCallback(() => {
    invalidateSpots();
  }, [invalidateSpots]);

  const handleExpandSpot = useCallback(
    (spot) => {
      if (expandedSpotId === spot.id) {
        setExpandedSpotId(null);
      } else {
        setExpandedSpotId(spot.id);
        setEditNotes(spot.notes || '');
      }
    },
    [expandedSpotId]
  );

  const handleSaveNotes = useCallback(
    (spotId) => {
      updateMutation.mutate({ id: spotId, data: { notes: editNotes } });
    },
    [editNotes, updateMutation]
  );

  const handleStatusChange = useCallback(
    (spotId, status) => {
      updateMutation.mutate({ id: spotId, data: { status } });
    },
    [updateMutation]
  );

  const handleDeleteSpot = useCallback(
    (spotId) => {
      const confirmed = window.confirm(
        'Etes-vous sur de vouloir supprimer ce spot ? Cette action est irreversible.'
      );
      if (confirmed) deleteMutation.mutate(spotId);
    },
    [deleteMutation]
  );

  // ── Table columns ──────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={spots.length > 0 && selectedIds.size === spots.length}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelect(row.original.id);
            }}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'url',
        header: 'URL',
        cell: ({ getValue }) => (
          <span className="text-gray-900 font-mono text-xs" title={getValue()}>
            {truncateUrl(getValue(), 40)}
          </span>
        ),
        size: 260,
      },
      {
        accessorKey: 'domain',
        header: 'Domaine',
        cell: ({ getValue }) => (
          <span className="text-gray-700 text-xs font-medium">
            {getValue() || '--'}
          </span>
        ),
        size: 150,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                SPOT_TYPE_COLORS[v] || 'bg-gray-50 text-gray-600'
              )}
            >
              {SPOT_TYPE_LABELS[v] || v}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">--</span>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'platform',
        header: 'Plateforme',
        cell: ({ getValue }) => (
          <span className="text-gray-500 text-xs">{getValue() || '--'}</span>
        ),
        size: 110,
      },
      {
        accessorKey: 'link_type',
        header: 'Lien',
        cell: ({ getValue }) => {
          const v = getValue();
          const isDofollow = v === 'dofollow';
          return v ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                isDofollow
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-50 text-gray-500'
              )}
            >
              {LINK_TYPE_LABELS[v] || v}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">--</span>
          );
        },
        size: 90,
      },
      {
        accessorKey: 'has_form',
        header: 'Formulaire',
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-medium">
              Oui
            </span>
          ) : (
            <span className="text-gray-300 text-xs">Non</span>
          );
        },
        size: 90,
      },
      {
        accessorKey: 'da',
        header: 'DA',
        cell: ({ getValue }) => {
          const v = getValue();
          return v != null ? (
            <span
              className={cn(
                'text-xs font-bold',
                v >= 40
                  ? 'text-emerald-600'
                  : v >= 20
                    ? 'text-amber-600'
                    : 'text-gray-500'
              )}
            >
              {v}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">--</span>
          );
        },
        size: 60,
      },
      {
        accessorKey: 'quality_score',
        header: 'Score',
        cell: ({ getValue }) => {
          const v = getValue();
          return v != null ? (
            <span
              className={cn(
                'text-xs font-bold',
                v >= 70
                  ? 'text-emerald-600'
                  : v >= 40
                    ? 'text-amber-600'
                    : 'text-red-500'
              )}
            >
              {v}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">--</span>
          );
        },
        size: 60,
      },
      {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ getValue }) => {
          const v = getValue();
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                SPOT_STATUS_COLORS[v] || 'bg-gray-100 text-gray-800'
              )}
            >
              {SPOT_STATUS_LABELS[v] || v}
            </span>
          );
        },
        size: 110,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const spot = row.original;
          return (
            <div className="flex items-center gap-1">
              {spot.url && (
                <a
                  href={spot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-300 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50"
                  title="Ouvrir l'URL"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {spot.notes && (
                <span
                  className="p-1.5 text-amber-400"
                  title={spot.notes}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          );
        },
        size: 70,
      },
    ],
    [spots, selectedIds, toggleSelectAll, toggleSelect]
  );

  // ── Table instance ─────────────────────────────────────────────────

  const table = useReactTable({
    data: spots,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  // ── Derived ────────────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasFilters = Object.entries(filters).some(([key, val]) => {
    if (key === 'sort_by') return val !== 'quality_score';
    if (typeof val === 'boolean') return val;
    return val !== '';
  });

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div>
        <h1 className="page-title">Spots</h1>
        <p className="page-subtitle">
          Gérez et qualifiez les spots découverts pour votre campagne de netlinking.
        </p>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-[#E8E0D5] w-fit">
        <button
          onClick={() => setActiveTab('spots')}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'spots'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          )}
        >
          <Target className="h-4 w-4" />
          Mes Spots
          {stats?.total != null && (
            <span className={cn(
              'text-xs rounded-full px-2 py-0.5 font-semibold',
              activeTab === 'spots' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            )}>
              {stats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'search'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          )}
        >
          <Search className="h-4 w-4" />
          Rechercher des spots
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── SEARCH TAB ───────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'search' && (
        <SearchPanel
          project={project}
          project_id={project_id}
          keywords={keywords}
          footprintsByCategory={footprintsByCategory}
          selectedFootprints={selectedFootprints}
          selectedKeywords={selectedKeywords}
          expandedCategories={expandedCategories}
          totalQueries={totalQueries}
          searches={searches}
          searchMutation={searchMutation}
          toggleSearchCategory={toggleSearchCategory}
          toggleSearchCategoryAll={toggleSearchCategoryAll}
          toggleFootprint={toggleFootprint}
          toggleKeyword={toggleKeyword}
          toggleAllKeywords={toggleAllKeywords}
          handleLaunchSearch={handleLaunchSearch}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── SPOTS TAB ────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'spots' && <>

      {/* ── Stats summary ───────────────────────────────────────────── */}
      {stats && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white text-gray-700 px-3 py-1.5 text-xs font-medium border border-[#D6CEC2]">
            Total : {stats.total ?? 0}
          </span>
          {stats.by_status &&
            Object.entries(stats.by_status).map(([status, count]) => (
              <span
                key={status}
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                  SPOT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
                )}
              >
                {SPOT_STATUS_LABELS[status] || status} : {count}
              </span>
            ))}
          {stats.by_type &&
            Object.entries(stats.by_type).map(([type, count]) => (
              <span
                key={type}
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                  SPOT_TYPE_COLORS[type] || 'bg-gray-50 text-gray-600'
                )}
              >
                {SPOT_TYPE_LABELS[type] || type} : {count}
              </span>
            ))}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-300" />
          <span className="text-sm font-medium text-gray-700">Filtres</span>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#FAF7F2]/50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            >
              <option value="">Tous</option>
              {Object.entries(SPOT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#FAF7F2]/50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            >
              <option value="">Tous</option>
              {SPOT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Plateforme</label>
            <input
              type="text"
              value={filters.platform}
              onChange={(e) => handleFilterChange('platform', e.target.value)}
              placeholder="WordPress, Joomla..."
              className="rounded-xl border border-gray-200 bg-[#FAF7F2]/50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none w-36 transition-all"
            />
          </div>

          {/* Dofollow only */}
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input
              type="checkbox"
              checked={filters.dofollow_only}
              onChange={(e) =>
                handleFilterChange('dofollow_only', e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Dofollow seulement</span>
          </label>

          {/* Has form */}
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input
              type="checkbox"
              checked={filters.has_form}
              onChange={(e) =>
                handleFilterChange('has_form', e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Avec formulaire</span>
          </label>

          {/* DA min */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">DA minimum</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.da_min}
              onChange={(e) => handleFilterChange('da_min', e.target.value)}
              placeholder="0"
              className="rounded-xl border border-gray-200 bg-[#FAF7F2]/50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none w-20 transition-all"
            />
          </div>

          {/* Sort by */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Trier par</label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#FAF7F2]/50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-all"
            >
              <X className="h-3.5 w-3.5" />
              Reinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-500 font-medium">
                {selectedIds.size} selectionne(s)
              </span>
              <button
                onClick={handleBulkSelect}
                disabled={bulkMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Selectionner
              </button>
              <button
                onClick={handleBulkReject}
                disabled={bulkMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-600 transition-all disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Rejeter
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="btn-secondary py-2"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="btn-secondary py-2"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')}
            />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Data table ──────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#FAF7F2] backdrop-blur-sm border-b border-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap"
                      style={{
                        width: header.getSize(),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-20 text-center"
                  >
                    <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin mx-auto" />
                    <p className="mt-3 text-sm text-[#6b6560]">
                      Chargement des spots...
                    </p>
                  </td>
                </tr>
              ) : spots.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-20 text-center"
                  >
                    <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-gray-50">
                      <Search className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="mt-3 text-sm text-[#6b6560]">
                      Aucun spot trouve.
                    </p>
                    {hasFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Reinitialiser les filtres
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const spot = row.original;
                  const isExpanded = expandedSpotId === spot.id;

                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => handleExpandSpot(spot)}
                        className={cn(
                          'cursor-pointer transition-colors duration-150',
                          isExpanded
                            ? 'bg-emerald-50/50'
                            : 'hover:bg-[#FAF7F2]',
                          selectedIds.has(spot.id) && 'bg-emerald-50/30'
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-2.5 whitespace-nowrap"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* ── Expanded detail panel ───────────────────── */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="bg-[#FAF7F2]/50 border-t border-b border-gray-100"
                          >
                            <SpotDetailPanel
                              spot={spot}
                              editNotes={editNotes}
                              setEditNotes={setEditNotes}
                              onSaveNotes={handleSaveNotes}
                              onStatusChange={handleStatusChange}
                              onQualify={(id) => qualifyMutation.mutate(id)}
                              onDelete={handleDeleteSpot}
                              onVerify={(id, isRelevant, reason) => verifyMutation.mutate({ id, isRelevant, reason })}
                              isUpdating={updateMutation.isPending || verifyMutation.isPending}
                              isQualifying={qualifyMutation.isPending}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────── */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-[#FAF7F2]/50">
            <p className="text-xs text-gray-400">
              Page {page + 1} sur {totalPages} -- {totalCount} spots au total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary py-2 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                Precedent
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="btn-secondary py-2 text-xs"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      </>}
    </div>
  );
}

// ── Search Panel ────────────────────────────────────────────────────────

function SearchPanel({
  project,
  project_id,
  keywords,
  footprintsByCategory,
  selectedFootprints,
  selectedKeywords,
  expandedCategories,
  totalQueries,
  searches,
  searchMutation,
  toggleSearchCategory,
  toggleSearchCategoryAll,
  toggleFootprint,
  toggleKeyword,
  toggleAllKeywords,
  handleLaunchSearch,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Footprint selection ──────────────────────────────────── */}
        <div className="card">
          <div className="px-7 py-5 border-b border-[#EDE4D3] flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Footprints</h2>
            <span className="text-xs font-medium text-[#9a9080] bg-[#F5F0E8] rounded-full px-2.5 py-1">
              {selectedFootprints.size} sélectionné(s)
            </span>
          </div>

          <div className="divide-y divide-[#EDE4D3] max-h-[480px] overflow-y-auto">
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
                  <div className="flex items-center gap-2 px-7 py-3 bg-[#FAF7F2]/50 hover:bg-gray-50 transition-colors cursor-pointer select-none">
                    <button
                      onClick={() => toggleSearchCategoryAll(cat)}
                      className="flex-shrink-0 text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Tout sélectionner / désélectionner"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                      ) : someSelected ? (
                        <CheckSquare className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleSearchCategory(cat)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        {fps.length}
                      </span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-gray-50/50">
                      {fps.map((fp) => (
                        <label
                          key={fp.id}
                          className="flex items-center gap-3 px-7 pl-16 py-3 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFootprints.has(fp.id)}
                            onChange={() => toggleFootprint(fp.id)}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
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
                              {DIFFICULTY_LABELS[fp.difficulty] || fp.difficulty}
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
                Aucun footprint disponible.
              </div>
            )}
          </div>
        </div>

        {/* ── Keywords + Launch ─────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="card">
            <div className="px-7 py-5 border-b border-[#EDE4D3] flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Mots-clés</h2>
              {keywords.length > 0 && (
                <button
                  onClick={toggleAllKeywords}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {selectedKeywords.size === keywords.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </button>
              )}
            </div>

            {keywords.length === 0 ? (
              <div className="px-7 py-10 text-center">
                <p className="text-sm text-amber-600 font-medium">
                  Analysez le site d'abord
                </p>
                <p className="mt-1.5 text-xs text-gray-400">
                  Lancez une analyse du site pour générer des mots-clés.
                </p>
                <Link
                  to={`/projects/${project_id}/analysis`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Aller à l'analyse
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#EDE4D3] max-h-[280px] overflow-y-auto">
                {keywords.map((kw) => (
                  <label
                    key={kw}
                    className="flex items-center gap-3 px-7 py-3 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeywords.has(kw)}
                      onChange={() => toggleKeyword(kw)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
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
              Aperçu de la recherche
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
                <p className="text-xs text-[#9a9080]">Footprints</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">
                  {selectedFootprints.size}
                </p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FAF7F2', border: '1px solid #EDE4D3' }}>
                <p className="text-xs text-[#9a9080]">Mots-clés</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">
                  {selectedKeywords.size}
                </p>
              </div>
              <div className="rounded-xl p-4 text-center bg-emerald-50 border border-emerald-100">
                <p className="text-xs font-medium text-emerald-600">Total requêtes</p>
                <p className="mt-1.5 text-xl font-bold text-emerald-700">
                  {totalQueries}
                </p>
              </div>
            </div>

            <button
              onClick={handleLaunchSearch}
              disabled={totalQueries === 0 || searchMutation.isPending}
              className="btn-primary w-full"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lancement en cours...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Lancer la recherche
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Search history table ─────────────────────────────────── */}
      {searches.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-7 py-5 border-b border-[#EDE4D3]">
            <h2 className="text-base font-bold text-gray-900">
              Historique des recherches ({searches.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: '#FAF7F2' }} className="border-b border-[#EDE4D3]">
                <tr className="text-left">
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Requête</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Mot-clé</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Statut</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Résultats</th>
                  <th className="px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9a9080]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE4D3]">
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
                            'bg-[#EDE4D3] text-gray-700'
                        )}
                      >
                        {SEARCH_STATUS_LABELS[search.status] || search.status}
                      </span>
                    </td>
                    <td className="px-7 py-3.5 text-gray-700 font-semibold">
                      {search.results_count ?? '--'}
                    </td>
                    <td className="px-7 py-3.5 text-[#9a9080] text-xs">
                      {formatDate(search.created_at)}
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

// ── Spot Detail Panel ──────────────────────────────────────────────────

function SpotDetailPanel({
  spot,
  editNotes,
  setEditNotes,
  onSaveNotes,
  onStatusChange,
  onQualify,
  onDelete,
  onVerify,
  isUpdating,
  isQualifying,
}) {
  return (
    <div className="px-7 py-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Info column ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Informations
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">URL complete</span>
              <a
                href={spot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700 truncate max-w-[200px] inline-flex items-center gap-1"
              >
                {truncateUrl(spot.url, 35)}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Domaine</span>
              <span className="text-gray-900 font-medium">
                {spot.domain || '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type</span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 font-medium',
                  SPOT_TYPE_COLORS[spot.type] || 'bg-gray-50 text-gray-600'
                )}
              >
                {SPOT_TYPE_LABELS[spot.type] || spot.type || '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Plateforme</span>
              <span className="text-gray-900">
                {spot.platform || '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type de lien</span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 font-medium',
                  spot.link_type === 'dofollow'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-50 text-gray-500'
                )}
              >
                {LINK_TYPE_LABELS[spot.link_type] || spot.link_type || '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Formulaire</span>
              <span className="text-gray-900">
                {spot.has_form ? 'Oui' : 'Non'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">DA</span>
              <span className="text-gray-900 font-bold">
                {spot.da ?? '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Score qualite</span>
              <span className="text-gray-900 font-bold">
                {spot.quality_score ?? '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Decouvert le</span>
              <span className="text-gray-600">
                {formatDate(spot.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Notes column ────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Ajouter des notes sur ce spot..."
            rows={5}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 resize-none outline-none transition-all"
          />
          <button
            onClick={() => onSaveNotes(spot.id)}
            disabled={isUpdating}
            className="btn-primary text-xs py-2"
          >
            <Check className="h-3.5 w-3.5" />
            Enregistrer les notes
          </button>
        </div>

        {/* ── Actions column ──────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Changer le statut
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPOT_STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onStatusChange(spot.id, key)}
                disabled={isUpdating || spot.status === key}
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                  spot.status === key
                    ? cn(SPOT_STATUS_COLORS[key], 'ring-2 ring-offset-1 ring-emerald-400')
                    : cn(
                        SPOT_STATUS_COLORS[key],
                        'opacity-60 hover:opacity-100 cursor-pointer'
                      )
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Vérification manuelle ───────────────────────────── */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Vérification manuelle
            </h3>
            <p className="text-xs text-gray-400">
              Ce spot est-il pertinent pour votre projet ?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onVerify(spot.id, true)}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Accepter (pertinent)
              </button>
              
              <button
                onClick={() => onVerify(spot.id, false, 'Non pertinent')}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Rejeter (faux positif)
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-2 border-t border-gray-200">
            <button
              onClick={() => onQualify(spot.id)}
              disabled={isQualifying}
              className="btn-primary text-xs py-2"
            >
              <RefreshCw
                className={cn(
                  'h-3.5 w-3.5',
                  isQualifying && 'animate-spin'
                )}
              />
              Requalifier
            </button>

            <button
              onClick={() => onDelete(spot.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-white px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
