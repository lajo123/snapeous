import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, Download, RefreshCw, Trash2, Globe, BarChart3, FileText, ExternalLink, CheckCircle, XCircle, MinusCircle, Plus, Upload, Filter, ChevronDown, ChevronUp, Zap, Loader } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBacklinks, getBacklinksCount, createBacklink, createBacklinksBulk,
  updateBacklink, deleteBacklink, deleteAllBacklinks, exportBacklinks,
  checkBacklink, checkAllBacklinks, checkBacklinkIndexation, fetchBacklinkMetrics,
  toggleAutoFetch, runAutoFetchNow,
} from '@/lib/api';
import { cn, BACKLINK_STATUS_COLORS, BACKLINK_LINK_TYPE_COLORS, getHttpStatusColor, formatDate, truncateUrl } from '@/lib/utils';
import AddBacklinkModal from './AddBacklinkModal';
import ImportBacklinksModal from './ImportBacklinksModal';
import EditBacklinkModal from './EditBacklinkModal';

const PER_PAGE = 10;

function getHttpLabel(code) {
  if (!code) return '?';
  if (code >= 200 && code < 300) return `${code} OK`;
  if (code === 301 || code === 302) return `${code} Redir.`;
  if (code === 404) return `${code} Lost`;
  if (code >= 400) return `${code} Err.`;
  return String(code);
}

export default function LinksTab({ projectId, project }) {
  const { t, i18n } = useTranslation(['backlinks', 'common']);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', link_type: '', search: '', is_indexed: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBacklink, setEditingBacklink] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const autoFetch = project?.auto_fetch_enabled ?? false;
  const autoFetchStatus = project?.auto_fetch_status ?? 'idle';
  const autoFetchLastRun = project?.auto_fetch_last_run;

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
    onSuccess: () => {
      toast.success(t('backlinks:toast.created'));
      toast.info(t('backlinks:toast.analyzingMetrics'), { duration: 4000 });
      setShowAddModal(false);
      invalidateAll();
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        toast.error(t('backlinks:toast.alreadyExists'));
      } else {
        toast.error(t('backlinks:toast.createError'));
      }
    },
  });
  const importMutation = useMutation({
    mutationFn: (items) => createBacklinksBulk(projectId, items),
    onSuccess: (data) => {
      toast.success(t('backlinks:toast.imported', { count: data.created }));
      if (data.skipped > 0) {
        toast.info(t('backlinks:toast.skipped', { count: data.skipped }));
      }
      if (data.created > 0) {
        toast.info(t('backlinks:toast.analyzingMetrics'), { duration: 4000 });
      }
      if (data.errors?.length > 0) {
        toast.warning(t('backlinks:toast.importErrors', { count: data.errors.length }));
      }
      setShowImportModal(false);
      invalidateAll();
    },
    onError: () => toast.error(t('backlinks:toast.importError')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBacklink(projectId, id, data),
    onSuccess: () => { toast.success(t('backlinks:toast.updated')); setEditingBacklink(null); invalidateAll(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBacklink(projectId, id),
    onSuccess: () => { toast.success(t('backlinks:toast.deleted')); invalidateAll(); },
  });
  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllBacklinks(projectId, { status: filters.status || undefined }),
    onSuccess: () => { toast.success(t('backlinks:toast.allDeleted')); invalidateAll(); },
  });
  const checkMutation = useMutation({
    mutationFn: (id) => checkBacklink(projectId, id),
    onSuccess: () => { toast.success(t('backlinks:toast.checkDone')); invalidateAll(); },
  });
  const checkAllMutation = useMutation({
    mutationFn: () => checkAllBacklinks(projectId, { status: filters.status || undefined }),
    onSuccess: () => { toast.success(t('backlinks:toast.checkAllLaunched')); invalidateAll(); },
  });
  const indexCheckMutation = useMutation({
    mutationFn: (id) => checkBacklinkIndexation(projectId, id),
    onSuccess: (data) => { toast.success(data.is_indexed ? t('backlinks:toast.indexedYes') : t('backlinks:toast.indexedNo')); invalidateAll(); },
    onError: () => toast.error(t('backlinks:toast.speedyIndexError')),
  });
  const metricsMutation = useMutation({
    mutationFn: (id) => fetchBacklinkMetrics(projectId, id),
    onSuccess: () => { toast.success(t('backlinks:toast.metricsDone')); invalidateAll(); },
    onError: () => toast.error(t('backlinks:toast.metricsError')),
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled) => toggleAutoFetch(projectId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      invalidateAll();
      toast.success(!autoFetch ? t('backlinks:toast.autoFetchEnabled') : t('backlinks:toast.autoFetchDisabled'));
    },
    onError: (error) => {
      if (error.response?.status === 403) {
        toast.error(t('backlinks:links.autoFetchPremium'));
      } else {
        toast.error(t('backlinks:toast.autoFetchError'));
      }
    },
  });

  const runNowMutation = useMutation({
    mutationFn: () => runAutoFetchNow(projectId),
    onSuccess: () => {
      toast.success(t('backlinks:toast.autoFetchStarted'));
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        toast.warning(t('backlinks:toast.autoFetchAlreadyRunning'));
      } else {
        toast.error(t('backlinks:toast.autoFetchError'));
      }
    },
  });

  const handleExport = () => {
    exportBacklinks(projectId, { status: filters.status || undefined, link_type: filters.link_type || undefined });
    toast.success(t('backlinks:toast.exportLaunched'));
  };

  const handleDeleteAll = () => {
    const filterLabel = filters.status ? t('backlinks:links.withStatus', { status: t(`common:backlinkStatus.${filters.status}`) }) : '';
    if (confirm(t('backlinks:links.deleteAllConfirm', { filter: filterLabel }))) {
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
          <Upload className="h-4 w-4" /> {t('backlinks:links.import')}
        </button>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> {t('backlinks:links.add')}
        </button>
        <button
          onClick={() => toggleMutation.mutate(!autoFetch)}
          disabled={toggleMutation.isPending}
          className={cn(
            'btn-secondary flex items-center gap-2',
            autoFetch && 'bg-brand-50 text-brand-700 border-brand-200'
          )}
          title={t('backlinks:links.autoFetchTooltip')}
        >
          {toggleMutation.isPending ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className={cn("h-4 w-4", autoFetch && "text-brand-500")} />
          )}
          {t('backlinks:links.autoFetch')}
        </button>
        {autoFetch && (
          <button
            onClick={() => runNowMutation.mutate()}
            disabled={runNowMutation.isPending || autoFetchStatus === 'running'}
            className="btn-secondary flex items-center gap-2"
            title={autoFetchLastRun ? t('backlinks:links.autoFetchLastRun', { date: formatDate(autoFetchLastRun, i18n.language) }) : t('backlinks:links.autoFetchNeverRun')}
          >
            {(runNowMutation.isPending || autoFetchStatus === 'running') ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {autoFetchStatus === 'running' ? t('backlinks:links.autoFetchRunning') : t('backlinks:links.runNow')}
          </button>
        )}
        <div className="flex-1" />
        <button onClick={handleExport} className="btn-secondary">
          <Download className="h-4 w-4" /> {t('backlinks:links.export')}
        </button>
        <button onClick={() => checkAllMutation.mutate()} disabled={checkAllMutation.isPending} className="btn-secondary">
          <RefreshCw className={cn("h-4 w-4", checkAllMutation.isPending && "animate-spin")} /> {t('backlinks:links.verifyAll')}
        </button>
        <button onClick={handleDeleteAll} disabled={deleteAllMutation.isPending} className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" /> {t('backlinks:links.deleteAll')}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
            <input
              type="text"
              placeholder={t('backlinks:links.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-ink-100 bg-cream-50/50 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-ink-100 bg-cream-50/50 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
            <option value="">{t('backlinks:links.allStatuses')}</option>
            {Object.keys(BACKLINK_STATUS_COLORS).map(k => <option key={k} value={k}>{t(`common:backlinkStatus.${k}`)}</option>)}
          </select>
          <select value={filters.link_type} onChange={(e) => { setFilters(f => ({ ...f, link_type: e.target.value })); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-ink-100 bg-cream-50/50 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
            <option value="">{t('backlinks:links.allTypes')}</option>
            {Object.keys(BACKLINK_LINK_TYPE_COLORS).map(k => <option key={k} value={k}>{t(`common:backlinkLinkType.${k}`)}</option>)}
          </select>
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn("btn-secondary", showAdvancedFilters && "bg-brand-50 text-brand-700")}>
            <Filter className="h-4 w-4" />
            {showAdvancedFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ink-50">
            <select value={filters.is_indexed} onChange={(e) => setFilters(f => ({ ...f, is_indexed: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-ink-100 bg-cream-50/50 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
              <option value="">{t('backlinks:links.indexation')}</option>
              <option value="true">{t('backlinks:links.indexedFilter')}</option>
              <option value="false">{t('backlinks:links.notIndexed')}</option>
              <option value="null">{t('backlinks:links.notChecked')}</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-50 border-b border-cream-200">
              <tr>
                <th className="table-header px-4 py-3">{t('backlinks:links.sourceUrl')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.targetUrl')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.anchor')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.http')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.type')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.status')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.isIndexed')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.drUr')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.check')}</th>
                <th className="table-header px-4 py-3">{t('backlinks:links.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {isLoading ? (
                <tr><td colSpan="10" className="px-6 py-12 text-center text-ink-300">{t('backlinks:links.loading')}</td></tr>
              ) : displayBacklinks.length === 0 ? (
                <tr><td colSpan="10" className="px-6 py-12 text-center text-ink-300">{t('backlinks:links.noBacklinks')}</td></tr>
              ) : (
                displayBacklinks.map((bl) => (
                  <tr key={bl.id} className="hover:bg-brand-50/40">
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
                      <span className="text-sm text-ink-500">{bl.target_url ? truncateUrl(bl.target_url, 30) : '-'}</span>
                    </td>
                    {/* Anchor */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-ink">{bl.anchor_text || '-'}</span>
                    </td>
                    {/* HTTP with label */}
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", getHttpStatusColor(bl.http_code))}>
                        {getHttpLabel(bl.http_code)}
                      </span>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", BACKLINK_LINK_TYPE_COLORS[bl.link_type] || 'bg-cream-50 text-ink')}>
                        {t(`common:backlinkLinkType.${bl.link_type}`, bl.link_type)}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", BACKLINK_STATUS_COLORS[bl.status])}>
                        {t(`common:backlinkStatus.${bl.status}`, bl.status)}
                      </span>
                    </td>
                    {/* Indexation icon */}
                    <td className="px-4 py-3">
                      {bl.is_indexed === true && <CheckCircle className="h-4 w-4 text-brand-500" />}
                      {bl.is_indexed === false && <XCircle className="h-4 w-4 text-red-500" />}
                      {bl.is_indexed == null && <MinusCircle className="h-4 w-4 text-ink-200" />}
                    </td>
                    {/* DR / UR with mini bar */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink w-6">{bl.domain_rank ?? '-'}</span>
                          {bl.domain_rank != null && (
                            <div className="flex-1 h-1.5 rounded-full bg-cream-50 max-w-[60px]">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(bl.domain_rank, 100)}%` }} />
                            </div>
                          )}
                        </div>
                        {bl.url_rank != null && (
                          <span className="text-[10px] text-ink-400">UR: {bl.url_rank}</span>
                        )}
                      </div>
                    </td>
                    {/* Check dates */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {bl.first_check_at && (
                          <p className="text-[10px] text-ink-400">{t('backlinks:links.firstCheck')}: {formatDate(bl.first_check_at, i18n.language)}</p>
                        )}
                        {bl.last_check_at && (
                          <p className="text-[10px] text-brand-600 font-medium">{t('backlinks:links.lastCheck')}: {formatDate(bl.last_check_at, i18n.language)}</p>
                        )}
                        {!bl.first_check_at && !bl.last_check_at && (
                          <span className="text-[10px] text-ink-200">-</span>
                        )}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => checkMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-cream-50 text-ink-500" title={t('backlinks:links.verifyHttp')}>
                          <RefreshCw className={cn("h-3.5 w-3.5", checkMutation.isPending && "animate-spin")} />
                        </button>
                        <button onClick={() => indexCheckMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-cream-50 text-ink-500" title={t('backlinks:links.verifyIndexation')}>
                          <Globe className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => metricsMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-cream-50 text-ink-500" title={t('backlinks:links.domainMetrics')}>
                          <BarChart3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingBacklink(bl)} className="p-1.5 rounded-lg hover:bg-cream-50 text-ink-500" title={t('backlinks:links.edit')}>
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(bl.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title={t('common:delete')}>
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-ink-50">
            <p className="text-sm text-ink-400">{t('backlinks:links.pageOf', { current: page, total: totalPages, count: counts?.total || 0 })}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-ink-100 text-sm font-medium disabled:opacity-50 hover:bg-surface-muted">{t('backlinks:links.previous')}</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-ink-100 text-sm font-medium disabled:opacity-50 hover:bg-surface-muted">{t('backlinks:links.next')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && <AddBacklinkModal onClose={() => setShowAddModal(false)} onSubmit={createMutation.mutate} isPending={createMutation.isPending} />}
      {showImportModal && <ImportBacklinksModal onClose={() => setShowImportModal(false)} onSubmit={importMutation.mutate} isPending={importMutation.isPending} currentCount={counts?.total || 0} />}
      {editingBacklink && <EditBacklinkModal backlink={editingBacklink} onClose={() => setEditingBacklink(null)} onSubmit={(data) => updateMutation.mutate({ id: editingBacklink.id, data })} isPending={updateMutation.isPending} />}
    </div>
  );
}
