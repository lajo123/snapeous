import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, Upload, Download, Trash2, Search, Filter, CheckCircle, XCircle, AlertCircle, Globe, ExternalLink, RefreshCw, BarChart3, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBacklinks,
  getBacklinksCount,
  createBacklink,
  createBacklinksBulk,
  updateBacklink,
  deleteBacklink,
  deleteAllBacklinks,
  exportBacklinks,
  checkBacklink,
  checkAllBacklinks,
  checkBacklinkIndexation,
  fetchBacklinkMetrics,
} from '@/lib/api';
import { cn, BACKLINK_STATUS_LABELS, BACKLINK_STATUS_COLORS, BACKLINK_LINK_TYPE_LABELS, BACKLINK_LINK_TYPE_COLORS, getHttpStatusColor, getIndexationStatusColor, getIndexationStatusLabel, formatDate, truncateUrl } from '@/lib/utils';

const PER_PAGE = 10;

export default function Backlinks() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    link_type: '',
    search: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBacklink, setEditingBacklink] = useState(null);

  // Fetch backlinks
  const { data: backlinks, isLoading } = useQuery({
    queryKey: ['backlinks', page, filters],
    queryFn: () => getBacklinks({
      page,
      per_page: PER_PAGE,
      status: filters.status || undefined,
      link_type: filters.link_type || undefined,
      search: filters.search || undefined,
    }),
  });

  // Fetch counts
  const { data: counts } = useQuery({
    queryKey: ['backlinks-count', filters],
    queryFn: () => getBacklinksCount({
      status: filters.status || undefined,
      link_type: filters.link_type || undefined,
      search: filters.search || undefined,
    }),
  });

  const totalPages = Math.ceil((counts?.total || 0) / PER_PAGE);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBacklink,
    onSuccess: () => {
      toast.success('Backlink créé avec succès');
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
      queryClient.invalidateQueries({ queryKey: ['backlinks-count'] });
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const importMutation = useMutation({
    mutationFn: createBacklinksBulk,
    onSuccess: (data) => {
      toast.success(`${data.created} backlinks importés avec succès`);
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erreurs lors de l'import`);
      }
      setShowImportModal(false);
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
      queryClient.invalidateQueries({ queryKey: ['backlinks-count'] });
    },
    onError: () => toast.error('Erreur lors de l\'import'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBacklink(id, data),
    onSuccess: () => {
      toast.success('Backlink mis à jour');
      setEditingBacklink(null);
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBacklink,
    onSuccess: () => {
      toast.success('Backlink supprimé');
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
      queryClient.invalidateQueries({ queryKey: ['backlinks-count'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllBacklinks({ status: filters.status || undefined }),
    onSuccess: (data) => {
      toast.success(`${data.count} backlinks supprimés`);
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
      queryClient.invalidateQueries({ queryKey: ['backlinks-count'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const checkMutation = useMutation({
    mutationFn: checkBacklink,
    onSuccess: () => {
      toast.success('Vérification lancée');
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
    },
  });

  const checkAllMutation = useMutation({
    mutationFn: () => checkAllBacklinks({ status: filters.status || undefined }),
    onSuccess: (data) => {
      toast.success(`Vérification de ${data.count} backlinks lancée`);
    },
  });

  const indexCheckMutation = useMutation({
    mutationFn: checkBacklinkIndexation,
    onSuccess: (data) => {
      toast.success(data.is_indexed ? 'URL indexée par Google' : 'URL non indexée');
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
    },
    onError: () => toast.error('SpeedyIndex API non configurée'),
  });

  const metricsMutation = useMutation({
    mutationFn: fetchBacklinkMetrics,
    onSuccess: () => {
      toast.success('Métriques récupérées');
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
    },
    onError: () => toast.error('DomDetailer API non configurée'),
  });

  const handleExport = () => {
    exportBacklinks({
      status: filters.status || undefined,
      link_type: filters.link_type || undefined,
    });
    toast.success('Export CSV lancé');
  };

  const handleDeleteAll = () => {
    if (confirm(`Supprimer tous les backlinks${filters.status ? ` avec statut "${filters.status}"` : ''} ?`)) {
      deleteAllMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backlinks</h1>
          <p className="text-sm text-gray-500 mt-1">
            {counts?.total || 0} backlinks trackés
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts?.by_status?.active || 0}</p>
              <p className="text-xs text-gray-500">Actifs</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts?.by_status?.lost || 0}</p>
              <p className="text-xs text-gray-500">Perdus</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts?.by_status?.pending || 0}</p>
              <p className="text-xs text-gray-500">En attente</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts?.total || 0}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par URL ou texte d'ancre..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(BACKLINK_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.link_type}
            onChange={(e) => setFilters(f => ({ ...f, link_type: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">Tous les types</option>
            {Object.entries(BACKLINK_LINK_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="btn-secondary"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
          <button
            onClick={() => checkAllMutation.mutate()}
            disabled={checkAllMutation.isPending}
            className="btn-secondary"
          >
            <RefreshCw className={cn("h-4 w-4", checkAllMutation.isPending && "animate-spin")} />
            Vérifier tout
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={deleteAllMutation.isPending}
            className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Tout supprimer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="table-header px-6 py-4">URL Source</th>
              <th className="table-header px-6 py-4">URL Cible</th>
              <th className="table-header px-6 py-4">Ancre</th>
              <th className="table-header px-6 py-4">HTTP</th>
              <th className="table-header px-6 py-4">Type</th>
              <th className="table-header px-6 py-4">Statut</th>
              <th className="table-header px-6 py-4">Indexé</th>
              <th className="table-header px-6 py-4">DR</th>
              <th className="table-header px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-400">
                  Chargement...
                </td>
              </tr>
            ) : backlinks?.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-400">
                  Aucun backlink trouvé
                </td>
              </tr>
            ) : (
              backlinks?.map((backlink) => (
                <tr key={backlink.id} className="hover:bg-orange-50/30">
                  <td className="px-6 py-4">
                    <a
                      href={backlink.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {truncateUrl(backlink.source_url, 40)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {truncateUrl(backlink.target_url, 35)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{backlink.anchor_text || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("badge", getHttpStatusColor(backlink.http_code))}>
                      {backlink.http_code || '?'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("badge", BACKLINK_LINK_TYPE_COLORS[backlink.link_type])}>
                      {BACKLINK_LINK_TYPE_LABELS[backlink.link_type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("badge", BACKLINK_STATUS_COLORS[backlink.status])}>
                      {BACKLINK_STATUS_LABELS[backlink.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("badge", getIndexationStatusColor(backlink.is_indexed))}>
                      {getIndexationStatusLabel(backlink.is_indexed)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {backlink.domain_rank || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => checkMutation.mutate(backlink.id)}
                        disabled={checkMutation.isPending}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Vérifier HTTP"
                      >
                        <RefreshCw className={cn("h-4 w-4", checkMutation.isPending && "animate-spin")} />
                      </button>
                      <button
                        onClick={() => indexCheckMutation.mutate(backlink.id)}
                        disabled={indexCheckMutation.isPending}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Vérifier indexation"
                      >
                        <Globe className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => metricsMutation.mutate(backlink.id)}
                        disabled={metricsMutation.isPending}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Métriques domaine"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingBacklink(backlink)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Modifier"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(backlink.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddBacklinkModal
          onClose={() => setShowAddModal(false)}
          onSubmit={createMutation.mutate}
          isPending={createMutation.isPending}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportBacklinksModal
          onClose={() => setShowImportModal(false)}
          onSubmit={importMutation.mutate}
          isPending={importMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingBacklink && (
        <EditBacklinkModal
          backlink={editingBacklink}
          onClose={() => setEditingBacklink(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingBacklink.id, data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────

function AddBacklinkModal({ onClose, onSubmit, isPending }) {
  const [formData, setFormData] = useState({
    source_url: '',
    target_url: '',
    anchor_text: '',
    link_type: 'dofollow',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Ajouter un backlink</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Source</label>
            <input
              type="url"
              required
              value={formData.source_url}
              onChange={(e) => setFormData(d => ({ ...d, source_url: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              placeholder="https://exemple.com/page"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Cible</label>
            <input
              type="url"
              required
              value={formData.target_url}
              onChange={(e) => setFormData(d => ({ ...d, target_url: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              placeholder="https://votresite.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte d'ancre</label>
            <input
              type="text"
              value={formData.anchor_text}
              onChange={(e) => setFormData(d => ({ ...d, anchor_text: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              placeholder="Cliquez ici"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de lien</label>
            <select
              value={formData.link_type}
              onChange={(e) => setFormData(d => ({ ...d, link_type: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            >
              <option value="dofollow">Dofollow</option>
              <option value="nofollow">Nofollow</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportBacklinksModal({ onClose, onSubmit, isPending }) {
  const [csvText, setCsvText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target.result);
      };
      reader.readAsText(file);
    } else {
      toast.error('Veuillez déposer un fichier CSV');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = () => {
    const lines = csvText.trim().split('\n');
    const items = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        items.push({
          source_url: parts[0],
          target_url: parts[1],
          anchor_text: parts[2] || undefined,
        });
      }
    }

    return items;
  };

  const handleSubmit = () => {
    const items = parseCSV();
    if (items.length === 0) {
      toast.error('Aucun backlink valide trouvé dans le CSV');
      return;
    }
    onSubmit(items);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Importer des backlinks</h2>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            isDragging ? "border-orange-400 bg-orange-50" : "border-gray-300 hover:border-gray-400"
          )}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Glissez-déposez un fichier CSV ici
          </p>
          <p className="text-xs text-gray-400 mb-4">ou</p>
          <label className="btn-secondary cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            Sélectionner un fichier
          </label>
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Format CSV: source_url, target_url, anchor_text (optionnel)</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="https://source.com/page,https://cible.com,mon ancre&#10;https://autre.com/page,https://cible.com"
            className="w-full h-32 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-mono focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !csvText.trim()}
            className="btn-primary"
          >
            {isPending ? 'Import...' : `Importer (${parseCSV().length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditBacklinkModal({ backlink, onClose, onSubmit, isPending }) {
  const [formData, setFormData] = useState({
    source_url: backlink.source_url,
    target_url: backlink.target_url,
    anchor_text: backlink.anchor_text || '',
    link_type: backlink.link_type,
    status: backlink.status,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Modifier le backlink</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Source</label>
            <input
              type="url"
              required
              value={formData.source_url}
              onChange={(e) => setFormData(d => ({ ...d, source_url: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Cible</label>
            <input
              type="url"
              required
              value={formData.target_url}
              onChange={(e) => setFormData(d => ({ ...d, target_url: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte d'ancre</label>
            <input
              type="text"
              value={formData.anchor_text}
              onChange={(e) => setFormData(d => ({ ...d, anchor_text: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.link_type}
                onChange={(e) => setFormData(d => ({ ...d, link_type: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="dofollow">Dofollow</option>
                <option value="nofollow">Nofollow</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(d => ({ ...d, status: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="active">Actif</option>
                <option value="lost">Perdu</option>
                <option value="pending">En attente</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? 'Mise à jour...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
