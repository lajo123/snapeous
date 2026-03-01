import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getFootprints,
  getFootprintCategories,
  createFootprint,
  deleteFootprint,
  seedFootprints,
} from '@/lib/api';
import {
  cn,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  LINK_TYPE_LABELS,
} from '@/lib/utils';
import { Plus, Trash2, Search, Filter, Database, Loader2, X } from 'lucide-react';

const INITIAL_FORM = {
  name: '',
  category: '',
  query_template: '',
  expected_link_type: '',
  difficulty: '',
  platform_target: '',
  description: '',
  tags: '',
};

export default function Footprints() {
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [seeded, setSeeded] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────

  const buildParams = () => {
    const params = {};
    if (categoryFilter) params.category = categoryFilter;
    if (difficultyFilter) params.difficulty = difficultyFilter;
    if (searchText.trim()) params.search = searchText.trim();
    return params;
  };

  const {
    data: footprints = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['footprints', categoryFilter, difficultyFilter, searchText],
    queryFn: () => getFootprints(buildParams()),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['footprint-categories'],
    queryFn: getFootprintCategories,
  });

  // ── Auto-seed on first load ──────────────────────────────────────────

  const seedMutation = useMutation({
    mutationFn: seedFootprints,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['footprints'] });
      queryClient.invalidateQueries({ queryKey: ['footprint-categories'] });
      toast.success(`${data?.count ?? 'Les'} footprints initialises avec succes`);
    },
    onError: () => {
      toast.error("Erreur lors de l'initialisation des footprints");
    },
  });

  useEffect(() => {
    if (!isLoading && !isError && footprints.length === 0 && !seeded && !seedMutation.isPending) {
      setSeeded(true);
      seedMutation.mutate();
    }
  }, [isLoading, isError, footprints.length, seeded, seedMutation.isPending]);

  // ── Mutations ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createFootprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footprints'] });
      queryClient.invalidateQueries({ queryKey: ['footprint-categories'] });
      toast.success('Footprint cree avec succes');
      setShowModal(false);
      setForm(INITIAL_FORM);
    },
    onError: () => {
      toast.error('Erreur lors de la creation du footprint');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFootprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footprints'] });
      queryClient.invalidateQueries({ queryKey: ['footprint-categories'] });
      toast.success('Footprint supprime');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.query_template) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    const payload = {
      ...form,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };
    createMutation.mutate(payload);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Category counts ──────────────────────────────────────────────────

  const categoryCountMap = {};
  if (Array.isArray(categories)) {
    categories.forEach((c) => {
      categoryCountMap[c.category] = c.count;
    });
  }

  const totalCount = Object.values(categoryCountMap).reduce((a, b) => a + b, 0);

  // ── Loading state ────────────────────────────────────────────────────

  if (isLoading || seedMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          <span className="text-sm text-gray-400">
            {seedMutation.isPending ? 'Initialisation des footprints...' : 'Chargement...'}
          </span>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────

  if (!isLoading && footprints.length === 0 && !categoryFilter && !difficultyFilter && !searchText) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bibliotheque de Footprints</h1>
          <p className="mt-1.5 text-sm text-gray-400">
            Gerez vos footprints pour la recherche de spots
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft px-6 py-20 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-gray-50">
            <Database className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="mt-5 text-sm font-semibold text-gray-900">Aucun footprint</h3>
          <p className="mt-1.5 text-sm text-gray-400">
            Initialisez la bibliotheque avec les footprints par defaut.
          </p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="btn-primary mt-5"
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Initialiser les footprints
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bibliotheque de Footprints</h1>
          <p className="mt-1.5 text-sm text-gray-400">
            {totalCount} footprints disponibles dans {Object.keys(categoryCountMap).length} categories
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Ajouter un footprint
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-300" />
            <span className="text-sm font-medium text-gray-700">Filtres :</span>
          </div>

          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
          >
            <option value="">Toutes les categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Difficulty dropdown */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
          >
            <option value="">Toutes les difficultes</option>
            {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <input
              type="text"
              placeholder="Rechercher un footprint..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-3 sticky top-4">
            <h3 className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Categories
            </h3>
            <nav className="space-y-0.5">
              <button
                onClick={() => setCategoryFilter('')}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all',
                  !categoryFilter
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                <span>Toutes</span>
                <span className="text-xs text-gray-400">{totalCount}</span>
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const count = categoryCountMap[key] ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all',
                      categoryFilter === key
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <span className="truncate">{label}</span>
                    <span className="ml-2 text-xs text-gray-400">{count}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
            {footprints.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-gray-50">
                  <Search className="h-7 w-7 text-gray-300" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-gray-900">
                  Aucun resultat
                </h3>
                <p className="mt-1.5 text-sm text-gray-400">
                  Aucun footprint ne correspond a vos filtres.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 text-left">
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Nom</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Categorie</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Template</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Type de lien</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Difficulte</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Plateforme</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Utilisations</th>
                      <th className="px-5 py-3.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {footprints.map((fp, idx) => (
                      <tr
                        key={fp.id}
                        className={cn(
                          'transition-colors duration-150 hover:bg-emerald-50/30',
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        )}
                      >
                        <td className="px-5 py-3">
                          <span className="font-medium text-gray-900">{fp.name}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                              CATEGORY_COLORS[fp.category] ?? 'bg-gray-100 text-gray-800'
                            )}
                          >
                            {CATEGORY_LABELS[fp.category] ?? fp.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 max-w-[260px]">
                          <code className="block truncate text-xs bg-gray-50 text-gray-600 rounded-lg px-2 py-1 font-mono">
                            {fp.query_template}
                          </code>
                        </td>
                        <td className="px-5 py-3">
                          {fp.expected_link_type && (
                            <span className="inline-flex items-center rounded-full bg-slate-50 text-slate-600 px-2.5 py-1 text-xs font-medium">
                              {LINK_TYPE_LABELS[fp.expected_link_type] ?? fp.expected_link_type}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {fp.difficulty && (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                                DIFFICULTY_COLORS[fp.difficulty] ?? 'bg-gray-100 text-gray-800'
                              )}
                            >
                              {DIFFICULTY_LABELS[fp.difficulty] ?? fp.difficulty}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">
                          {fp.platform_target || '--'}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500 tabular-nums font-medium">
                          {fp.usage_count ?? 0}
                        </td>
                        <td className="px-5 py-3">
                          {fp.is_custom && (
                            <button
                              onClick={() => {
                                if (window.confirm('Supprimer ce footprint personnalise ?')) {
                                  deleteMutation.mutate(fp.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Ajouter un footprint */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-xl shadow-soft-lg border border-gray-100 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-7 py-5 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Ajouter un footprint personnalise
                </h2>
                <p className="mt-0.5 text-sm text-gray-400">
                  Creez un nouveau footprint pour vos recherches de spots.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-7 py-5 space-y-5">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Ex: Forums WordPress FR"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Categorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categorie <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
                >
                  <option value="">Selectionner une categorie</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Query template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template de requete <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.query_template}
                  onChange={(e) => handleFormChange('query_template', e.target.value)}
                  rows={3}
                  placeholder='Ex: inurl:forum "{keyword}" site:.fr'
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-mono focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none resize-vertical transition-all"
                />
              </div>

              {/* Type de lien + Difficulte */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de lien attendu
                  </label>
                  <select
                    value={form.expected_link_type}
                    onChange={(e) => handleFormChange('expected_link_type', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
                  >
                    <option value="">Non specifie</option>
                    {Object.entries(LINK_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulte
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => handleFormChange('difficulty', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
                  >
                    <option value="">Non specifie</option>
                    {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plateforme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plateforme cible
                </label>
                <input
                  type="text"
                  value={form.platform_target}
                  onChange={(e) => handleFormChange('platform_target', e.target.value)}
                  placeholder="Ex: WordPress, phpBB, Discourse..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={2}
                  placeholder="Description optionnelle du footprint"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none resize-vertical transition-all"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => handleFormChange('tags', e.target.value)}
                  placeholder="Separes par des virgules : seo, forum, fr"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Creer le footprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
