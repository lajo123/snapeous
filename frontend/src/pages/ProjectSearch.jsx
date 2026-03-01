import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getProject,
  getFootprints,
  getFootprintCategories,
  getSearches,
  createSearch,
} from '@/lib/api';
import {
  cn,
  CATEGORY_LABELS,
  SEARCH_STATUS_LABELS,
  SEARCH_STATUS_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  formatDate,
} from '@/lib/utils';
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['searches', project_id] });
      queryClient.invalidateQueries({ queryKey: ['project', project_id] });
      toast.success(`Recherche lancee -- ${totalQueries} requete(s) creee(s)`);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Erreur lors du lancement de la recherche'
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
      `Cela va lancer ${totalQueries} requetes Google. Continuer ?`
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
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Projet introuvable.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Recherche SERP</h1>
        <p className="page-subtitle">
          Sélectionnez les footprints et mots-clés pour lancer une recherche
          Google sur{' '}
          <span className="font-semibold text-gray-900">{project.client_domain}</span>
        </p>
      </div>

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
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-7 py-3 bg-[#FAF7F2]/50 hover:bg-gray-50 transition-colors cursor-pointer select-none">
                    <button
                      onClick={() => toggleCategoryAll(cat)}
                      className="flex-shrink-0 text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Tout selectionner / deselectionner"
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
                      onClick={() => toggleCategory(cat)}
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

                  {/* Footprint list */}
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

        {/* ── Keywords selection ───────────────────────────────────── */}
        <div className="space-y-6">
          <div className="card">
            <div className="px-7 py-5 border-b border-[#EDE4D3] flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Mots-clés
              </h2>
              {keywords.length > 0 && (
                <button
                  onClick={toggleAllKeywords}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {selectedKeywords.size === keywords.length
                    ? 'Tout deselectionner'
                    : 'Tout selectionner'}
                </button>
              )}
            </div>

            {keywords.length === 0 ? (
              <div className="px-7 py-10 text-center">
                <p className="text-sm text-amber-600 font-medium">
                  Analysez le site d'abord
                </p>
                <p className="mt-1.5 text-xs text-gray-400">
                  Lancez une analyse du site pour generer des mots-cles.
                </p>
                <Link
                  to={`/projects/${project_id}/analysis`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Aller a l'analyse
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
              disabled={
                totalQueries === 0 || searchMutation.isPending
              }
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

      {/* ── Search progress table ─────────────────────────────────── */}
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
