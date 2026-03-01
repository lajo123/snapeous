import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, RefreshCw, Trash2, Globe, BarChart3, FileText, ExternalLink, CheckCircle, XCircle, MinusCircle, Plus, Upload, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBacklinks, getBacklinksCount, createBacklink, createBacklinksBulk,
  updateBacklink, deleteBacklink, deleteAllBacklinks, exportBacklinks,
  checkBacklink, checkAllBacklinks, checkBacklinkIndexation, fetchBacklinkMetrics,
} from '@/lib/api';
import { cn, BACKLINK_STATUS_LABELS, BACKLINK_STATUS_COLORS, BACKLINK_LINK_TYPE_LABELS, BACKLINK_LINK_TYPE_COLORS, getHttpStatusColor, formatDate, truncateUrl } from '@/lib/utils';
import AddBacklinkModal from './AddBacklinkModal';
import ImportBacklinksModal from './ImportBacklinksModal';
import EditBacklinkModal from './EditBacklinkModal';

const PER_PAGE = 10;

function getHttpLabel(code) {
  if (!code) return '?';
  if (code >= 200 && code < 300) return `${code} OK`;
  if (code === 301 || code === 302) return `${code} Redir.`;
  if (code === 404) return `${code} Perdu`;
  if (code >= 400) return `${code} Err.`;
  return String(code);
}

export default function LinksTab({ projectId }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', link_type: '', search: '', is_indexed: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBacklink, setEditingBacklink] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { data: backlinks, isLoading } = useQuery({
    queryKey: ['backlinks', projectId, page, filters],
    queryFn: () => getBacklinks(projectId, {
      page, per_page: PER_PAGE,
      status: filters.status || undefined,
      link_type: filters.link_type || undefined,
      search: filters.search || undefined,
    }),
  });

  const { data: counts } = useQuery({
    queryKey: ['backlinks-count', projectId, filters],
    queryFn: () => getBacklinksCount(projectId, {
      status: filters.status || undefined,
      link_type: filters.link_type || undefined,
      search: filters.search || undefined,
    }),
  });

  const totalPages = Math.ceil((counts?.total || 0) / PER_PAGE);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['backlinks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['backlinks-count', projectId] });
    queryClient.invalidateQueries({ queryKey: ['backlink-stats', projectId] });
    queryClient.invalidateQueries({ queryKey: ['backlink-anchors', projectId] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => createBacklink(projectId, data),
    onSuccess: () => { toast.success('Backlink cree avec succes'); setShowAddModal(false); invalidateAll(); },
    onError: () => toast.error('Erreur lors de la creation'),
  });
  const importMutation = useMutation({
    mutationFn: (items) => createBacklinksBulk(projectId, items),
    onSuccess: (data) => { toast.success(`${data.created} backlinks importes`); setShowImportModal(false); invalidateAll(); },
    onError: () => toast.error("Erreur lors de l'import"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBacklink(projectId, id, data),
    onSuccess: () => { toast.success('Backlink mis a jour'); setEditingBacklink(null); invalidateAll(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBacklink(projectId, id),
    onSuccess: () => { toast.success('Backlink supprime'); invalidateAll(); },
  });
  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllBacklinks(projectId, { status: filters.status || undefined }),
    onSuccess: () => { toast.success('Backlinks supprimes'); invalidateAll(); },
  });
  const checkMutation = useMutation({
    mutationFn: (id) => checkBacklink(projectId, id),
    onSuccess: () => { toast.success('Verification terminee'); invalidateAll(); },
  });
  const checkAllMutation = useMutation({
    mutationFn: () => checkAllBacklinks(projectId, { status: filters.status || undefined }),
    onSuccess: () => { toast.success('Verification lancee en arriere-plan'); invalidateAll(); },
  });
  const indexCheckMutation = useMutation({
    mutationFn: (id) => checkBacklinkIndexation(projectId, id),
    onSuccess: (data) => { toast.success(data.is_indexed ? 'URL indexee par Google' : 'URL non indexee'); invalidateAll(); },
    onError: () => toast.error('SpeedyIndex API non configuree'),
  });
  const metricsMutation = useMutation({
    mutationFn: (id) => fetchBacklinkMetrics(projectId, id),
    onSuccess: () => { toast.success('Metriques recuperees'); invalidateAll(); },
    onError: () => toast.error('DomDetailer API non configuree'),
  });

  const handleExport = () => {
    exportBacklinks(projectId, { status: filters.status || undefined, link_type: filters.link_type || undefined });
    toast.success('Export CSV lance');
  };

  const handleDeleteAll = () => {
    if (confirm(`Supprimer tous les backlinks${filters.status ? ` avec statut "${filters.status}"` : ''} ?`)) {
      deleteAllMutation.mutate();
    }
  };

  // Filter backlinks client-side for is_indexed filter
  let displayBacklinks = backlinks || [];
  if (filters.is_indexed === 'true') displayBacklinks = displayBacklinks.filter(b => b.is_indexed === true);
  else if (filters.is_indexed === 'false') displayBacklinks = displayBacklinks.filter(b => b.is_indexed === false);
  else if (filters.is_indexed === 'null') displayBacklinks = displayBacklinks.filter(b => b.is_indexed == null);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowImportModal(true)} className="btn-secondary">
          <Upload className="h-4 w-4" /> Importer CSV
        </button>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
        <div className="flex-1" />
        <button onClick={handleExport} className="btn-secondary">
          <Download className="h-4 w-4" /> Exporter
        </button>
        <button onClick={() => checkAllMutation.mutate()} disabled={checkAllMutation.isPending} className="btn-secondary">
          <RefreshCw className={cn("h-4 w-4", checkAllMutation.isPending && "animate-spin")} /> Verifier tout
        </button>
        <button onClick={handleDeleteAll} disabled={deleteAllMutation.isPending} className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" /> Tout supprimer
        </button>
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
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
            <option value="">Tous les statuts</option>
            {Object.entries(BACKLINK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filters.link_type} onChange={(e) => { setFilters(f => ({ ...f, link_type: e.target.value })); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
            <option value="">Tous les types</option>
            {Object.entries(BACKLINK_LINK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn("btn-secondary", showAdvancedFilters && "bg-emerald-50 text-emerald-700")}>
            <Filter className="h-4 w-4" />
            {showAdvancedFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <select value={filters.is_indexed} onChange={(e) => setFilters(f => ({ ...f, is_indexed: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
              <option value="">Indexation</option>
              <option value="true">Indexe</option>
              <option value="false">Non indexe</option>
              <option value="null">Non verifie</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#FAF7F2' }} className="border-b border-[#EDE4D3]">
              <tr>
                <th className="table-header px-4 py-3">URL Source</th>
                <th className="table-header px-4 py-3">URL Cible</th>
                <th className="table-header px-4 py-3">Ancre</th>
                <th className="table-header px-4 py-3">HTTP</th>
                <th className="table-header px-4 py-3">Type</th>
                <th className="table-header px-4 py-3">Statut</th>
                <th className="table-header px-4 py-3">Indexe</th>
                <th className="table-header px-4 py-3">DR / UR</th>
                <th className="table-header px-4 py-3">Check</th>
                <th className="table-header px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE4D3]">
              {isLoading ? (
                <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-400">Chargement...</td></tr>
              ) : displayBacklinks.length === 0 ? (
                <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-400">Aucun backlink trouve</td></tr>
              ) : (
                displayBacklinks.map((bl) => (
                  <tr key={bl.id} className="hover:bg-emerald-50/40">
                    {/* Source URL with favicon */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${bl.source_domain}&sz=16`}
                          alt=""
                          className="w-4 h-4 rounded-sm"
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <a href={bl.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                          {truncateUrl(bl.source_url, 35)}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    </td>
                    {/* Target URL */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{bl.target_url ? truncateUrl(bl.target_url, 30) : '-'}</span>
                    </td>
                    {/* Anchor */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{bl.anchor_text || '-'}</span>
                    </td>
                    {/* HTTP with label */}
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", getHttpStatusColor(bl.http_code))}>
                        {getHttpLabel(bl.http_code)}
                      </span>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", BACKLINK_LINK_TYPE_COLORS[bl.link_type] || 'bg-gray-100 text-gray-800')}>
                        {BACKLINK_LINK_TYPE_LABELS[bl.link_type] || '?'}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", BACKLINK_STATUS_COLORS[bl.status])}>
                        {BACKLINK_STATUS_LABELS[bl.status]}
                      </span>
                    </td>
                    {/* Indexation icon */}
                    <td className="px-4 py-3">
                      {bl.is_indexed === true && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                      {bl.is_indexed === false && <XCircle className="h-4 w-4 text-red-500" />}
                      {bl.is_indexed == null && <MinusCircle className="h-4 w-4 text-gray-300" />}
                    </td>
                    {/* DR / UR with mini bar */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 w-6">{bl.domain_rank ?? '-'}</span>
                          {bl.domain_rank != null && (
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 max-w-[60px]">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(bl.domain_rank, 100)}%` }} />
                            </div>
                          )}
                        </div>
                        {bl.url_rank != null && (
                          <span className="text-[10px] text-[#6b6560]">UR: {bl.url_rank}</span>
                        )}
                      </div>
                    </td>
                    {/* Check dates */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {bl.first_check_at && (
                          <p className="text-[10px] text-[#6b6560]">1er: {formatDate(bl.first_check_at)}</p>
                        )}
                        {bl.last_check_at && (
                          <p className="text-[10px] text-emerald-600 font-medium">Der: {formatDate(bl.last_check_at)}</p>
                        )}
                        {!bl.first_check_at && !bl.last_check_at && (
                          <span className="text-[10px] text-gray-300">-</span>
                        )}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => checkMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="Verifier HTTP">
                          <RefreshCw className={cn("h-3.5 w-3.5", checkMutation.isPending && "animate-spin")} />
                        </button>
                        <button onClick={() => indexCheckMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="Verifier indexation">
                          <Globe className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => metricsMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="Metriques domaine">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingBacklink(bl)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="Modifier">
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-[#6b6560]">Page {page} sur {totalPages} ({counts?.total || 0} liens)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 hover:bg-gray-50">Precedent</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 hover:bg-gray-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && <AddBacklinkModal onClose={() => setShowAddModal(false)} onSubmit={createMutation.mutate} isPending={createMutation.isPending} />}
      {showImportModal && <ImportBacklinksModal onClose={() => setShowImportModal(false)} onSubmit={importMutation.mutate} isPending={importMutation.isPending} />}
      {editingBacklink && <EditBacklinkModal backlink={editingBacklink} onClose={() => setEditingBacklink(null)} onSubmit={(data) => updateMutation.mutate({ id: editingBacklink.id, data })} isPending={updateMutation.isPending} />}
    </div>
  );
}
