import { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BarChart3,
  Target,
  Link2,
  Settings,
  FolderOpen,
  ChevronDown,
  Check,
  Plus,
  X,
  Trash2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProject, getProjects, createProject, deleteProject, analyzeProject } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradeModal from './UpgradeModal';
import LanguageSwitcher from './LanguageSwitcher';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';
import useLocalizedPath from '@/hooks/useLocalizedPath';

const PROJECT_NAV = [
  { key: 'dashboard',  path: '',           icon: LayoutDashboard },
  { key: 'analysis',   path: '/analysis',  icon: BarChart3 },
  { key: 'backlinks',  path: '/backlinks', icon: Link2 },
  { key: 'spots',      path: '/spots',     icon: Target },
];

export default function Layout() {
  const { id: routeProjectId } = useParams();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const lp = useLocalizedPath();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { plan, isTrialing } = useSubscription();
  const { t } = useTranslation('app');

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const activeProjectId = routeProjectId || (projects[0]?.id ?? null);

  // Reset favicon error when project changes
  useEffect(() => { setFaviconError(false); }, [activeProjectId]);

  const { data: activeProject } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => getProject(activeProjectId),
    enabled: !!activeProjectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProject(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(t('toast.projectDeleted'));
      if (deletedId === activeProjectId) {
        navigate('/dashboard');
      }
    },
    onError: () => toast.error(t('toast.deleteError')),
  });

  const handleDeleteProject = (e, projectId, projectName) => {
    e.stopPropagation();
    if (window.confirm(t('confirm.deleteProject', { name: projectName }))) {
      deleteMutation.mutate(projectId);
    }
  };

  const createMutation = useMutation({
    mutationFn: () => createProject({ name: newName, client_domain: newDomain }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('toast.projectCreated'));
      setShowNewModal(false);
      setNewName('');
      setNewDomain('');
      navigate(`/projects/${data.id}`);
      // Trigger site analysis in background (fire-and-forget)
      analyzeProject(data.id).catch(() => {});
    },
    onError: () => toast.error(t('toast.createError')),
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim()) {
      toast.error(t('toast.fieldsRequired'));
      return;
    }
    createMutation.mutate();
  };

  const switchProject = (projectId) => {
    const currentSuffix = routeProjectId
      ? location.pathname.replace(/^\/[a-z]{2}/, '').replace(`/projects/${routeProjectId}`, '')
      : '';
    const validSuffixes = ['/spots', '/analysis', '/backlinks', '/keywords', '/search'];
    const suffix = validSuffixes.includes(currentSuffix) ? currentSuffix : '';
    navigate(`/projects/${projectId}${suffix}`);
    setProjectMenuOpen(false);
  };

  return (
    <div className="grain-overlay flex h-screen overflow-hidden" style={{ backgroundColor: '#F0E6D8' }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 bg-[#FEFEFE] flex flex-col border-r border-[#E8DCCB]">

        {/* Logo + Plan badge */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <img src="/snapeous-logo.svg" alt="Snapeous" className="h-6 w-6 shrink-0" />
            <span className="text-sm font-bold tracking-tight text-[#2A2A2A]">Snapeous</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
              plan === 'agency' ? 'bg-violet-100 text-violet-700'
                : plan === 'pro' ? 'bg-brand-100 text-brand-700'
                : plan === 'starter' ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500'
            )}>
              {plan}
            </span>
            {isTrialing && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {t('sidebar.trial')}
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">

          {activeProjectId && PROJECT_NAV.map(({ key, path, icon: Icon }) => {
            const to = path === ''
              ? lp(`/projects/${activeProjectId}`)
              : lp(`/projects/${activeProjectId}${path}`);

            const isActive = path === ''
              ? location.pathname.endsWith(`/projects/${activeProjectId}`)
              : location.pathname.includes(`/projects/${activeProjectId}${path}`);

            return (
              <NavLink
                key={key}
                to={to}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-[#5a5550] hover:bg-[#F0E6D8] hover:text-[#2A2A2A]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(`nav.${key}`)}
              </NavLink>
            );
          })}

          {!activeProjectId && (
            <div className="px-3 py-8 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-[#F0E6D8]">
                <FolderOpen className="h-6 w-6 text-[#9a9080]" />
              </div>
              <p className="mt-3 text-xs font-medium text-[#6b6560]">{t('sidebar.noProject')}</p>
              <p className="mt-1 text-[11px] text-[#9a9080]">{t('sidebar.createToStart')}</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {t('sidebar.newProject')}
              </button>
            </div>
          )}

          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#b0a898]">
              {t('sidebar.configuration')}
            </span>
          </div>

          <NavLink
            to={lp('/settings')}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-[#5a5550] hover:bg-[#F0E6D8] hover:text-[#2A2A2A]'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {t('sidebar.settings')}
          </NavLink>
        </nav>

        {/* ── Language + Project selector at bottom ─────────────── */}
        <div className="relative px-3 pb-4 pt-2 border-t border-[#E8DCCB]">
          <div className="mb-2">
            <LanguageSwitcher variant="compact" />
          </div>
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-lg text-sm font-medium text-[#5a5550] hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t('sidebar.logout')}
          </button>
          <button
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors text-left',
              projectMenuOpen ? 'bg-brand-50' : 'bg-[#F0E6D8] hover:bg-[#E8DCCB]'
            )}
          >
            {activeProject?.site_analysis?.favicon_url && !faviconError ? (
              <img
                src={activeProject.site_analysis.favicon_url}
                alt=""
                className="h-7 w-7 shrink-0 rounded-lg object-contain"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 font-bold text-[11px] uppercase">
                {activeProject?.name?.slice(0, 2) ?? 'SP'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#2A2A2A] truncate leading-tight">
                {activeProject?.name ?? t('sidebar.selectProject')}
              </p>
              <p className="text-[11px] text-[#9a9080] truncate leading-tight mt-0.5">
                {activeProject?.client_domain || t('sidebar.noActiveProject')}
              </p>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-[#9a9080] transition-transform', projectMenuOpen && 'rotate-180')} />
          </button>

          {projectMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProjectMenuOpen(false)} />

              <div className="absolute bottom-full left-3 right-3 mb-1 z-50 bg-[#FEFEFE] rounded-xl border border-[#E8DCCB] shadow-lg max-h-[320px] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E8DCCB]">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#b0a898]">{t('sidebar.projects')}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectMenuOpen(false);
                      setShowNewModal(true);
                    }}
                    className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {t('sidebar.new')}
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {projects.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-[#9a9080]">{t('sidebar.noProject')}</p>
                    </div>
                  ) : (
                    projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => switchProject(p.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors group/item',
                          p.id === activeProjectId
                            ? 'bg-brand-50'
                            : 'hover:bg-[#FAF7F2]'
                        )}
                      >
                        {p.site_analysis?.favicon_url ? (
                          <img
                            src={p.site_analysis.favicon_url}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-md object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={cn(
                            'h-6 w-6 shrink-0 items-center justify-center rounded-md font-bold text-[10px] uppercase',
                            p.id === activeProjectId
                              ? 'bg-brand-100 text-brand-700'
                              : 'bg-[#F0E6D8] text-[#9a9080]'
                          )}
                          style={{ display: p.site_analysis?.favicon_url ? 'none' : 'flex' }}
                        >
                          {p.name?.slice(0, 2) ?? 'PR'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'text-xs truncate leading-tight',
                            p.id === activeProjectId ? 'font-semibold text-brand-700' : 'font-medium text-[#2A2A2A]'
                          )}>
                            {p.name}
                          </p>
                          <p className="text-[10px] text-[#9a9080] truncate leading-tight mt-0.5">
                            {p.client_domain}
                          </p>
                        </div>
                        {p.id === activeProjectId && (
                          <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                        )}
                        <button
                          onClick={(e) => handleDeleteProject(e, p.id, p.name)}
                          className="p-1 rounded-md text-[#c0b8ae] opacity-0 group-hover/item:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                          title={t('sidebar.deleteTitle')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Upgrade Modal (global) ──────────────────────────────── */}
      <UpgradeModal />

      {/* ── Modal: New project ──────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-[#FEFEFE] rounded-2xl shadow-soft-lg w-full max-w-md border border-[#E8DCCB]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8DCCB]">
              <h2 className="text-base font-bold text-[#2A2A2A]">{t('projectModal.title')}</h2>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 text-[#9a9080] hover:text-[#2A2A2A] rounded-lg hover:bg-[#F0E6D8] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#2A2A2A] mb-1.5">{t('projectModal.nameLabel')}</label>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder={t('projectModal.namePlaceholder')} className="input" autoFocus required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2A2A2A] mb-1.5">{t('projectModal.domainLabel')}</label>
                <input
                  type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
                  placeholder={t('projectModal.domainPlaceholder')} className="input" required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary">{t('projectModal.cancel')}</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? t('projectModal.creating') : t('projectModal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
