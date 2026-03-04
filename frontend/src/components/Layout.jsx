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
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProject, getProjects, deleteProject } from '@/lib/api';
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
  const [faviconError, setFaviconError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on tablet-sized screens (768–1024px)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px) and (max-width: 1024px)');
    const handler = (e) => setSidebarCollapsed(e.matches);
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const activeProjectId = routeProjectId || (projects[0]?.id ?? null);

  // Reset favicon error when project changes
  useEffect(() => { setFaviconError(false); }, [activeProjectId]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

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

  const switchProject = (projectId) => {
    const currentSuffix = routeProjectId
      ? location.pathname.replace(/^\/[a-z]{2}/, '').replace(`/projects/${routeProjectId}`, '')
      : '';
    const validSuffixes = ['/spots', '/analysis', '/backlinks', '/keywords', '/search'];
    const suffix = validSuffixes.includes(currentSuffix) ? currentSuffix : '';
    navigate(`/projects/${projectId}${suffix}`);
    setProjectMenuOpen(false);
  };

  const collapsed = sidebarCollapsed && !sidebarOpen; // never collapse the mobile drawer

  const sidebarContent = (
    <>
      {/* Logo + Plan badge */}
      <div className={cn('pt-6 pb-5', collapsed ? 'px-2' : 'px-5')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
          <img src="/snapeous-logo.svg" alt="Snapeous" className="h-6 w-6 shrink-0" />
          {!collapsed && <span className="text-sm font-bold tracking-tight text-ink">Snapeous</span>}
        </div>
        {!collapsed && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
              plan === 'agency' ? 'bg-violet-100 text-violet-700'
                : plan === 'pro' ? 'bg-brand-100 text-brand-700'
                : plan === 'starter' ? 'bg-blue-100 text-blue-700'
                : 'bg-cream-50 text-ink-400'
            )}>
              {plan}
            </span>
            {isTrialing && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {t('sidebar.trial')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto pb-2 space-y-0.5', collapsed ? 'px-1.5' : 'px-3')}>
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
              title={collapsed ? t(`nav.${key}`) : undefined}
              aria-label={collapsed ? t(`nav.${key}`) : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-500 hover:bg-cream hover:text-ink'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && t(`nav.${key}`)}
            </NavLink>
          );
        })}

        {!activeProjectId && !collapsed && (
          <div className="px-3 py-8 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-cream">
              <FolderOpen className="h-6 w-6 text-ink-300" />
            </div>
            <p className="mt-3 text-xs font-medium text-ink-400">{t('sidebar.noProject')}</p>
            <p className="mt-1 text-[11px] text-ink-300">{t('sidebar.createToStart')}</p>
            <button
              onClick={() => navigate('/onboarding')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
              {t('sidebar.newProject')}
            </button>
          </div>
        )}

        {!activeProjectId && collapsed && (
          <button
            onClick={() => navigate('/onboarding')}
            title={t('sidebar.newProject')}
            aria-label={t('sidebar.newProject')}
            className="w-full flex justify-center p-2.5 rounded-lg text-ink-500 hover:bg-cream hover:text-ink transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {!collapsed && (
          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-200">
              {t('sidebar.configuration')}
            </span>
          </div>
        )}

        {collapsed && <div className="pt-3" />}

        <NavLink
          to={lp('/settings')}
          title={collapsed ? t('sidebar.settings') : undefined}
          aria-label={collapsed ? t('sidebar.settings') : undefined}
          className={({ isActive }) => cn(
            'flex items-center rounded-lg text-sm font-medium transition-colors',
            collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
            isActive
              ? 'bg-brand-50 text-brand-700'
              : 'text-ink-500 hover:bg-cream hover:text-ink'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && t('sidebar.settings')}
        </NavLink>
      </nav>

      {/* ── Language + Project selector at bottom ─────────────── */}
      <div className={cn('relative pb-4 pt-2 border-t border-cream-200', collapsed ? 'px-1.5' : 'px-3')}>
        {!collapsed && (
          <div className="mb-2">
            <LanguageSwitcher variant="compact" />
          </div>
        )}
        <button
          onClick={async () => { await signOut(); navigate('/login'); }}
          title={collapsed ? t('sidebar.logout') : undefined}
          aria-label={collapsed ? t('sidebar.logout') : undefined}
          className={cn(
            'w-full flex items-center rounded-lg text-sm font-medium text-ink-500 hover:bg-red-50 hover:text-red-600 transition-colors',
            collapsed ? 'justify-center p-2.5 mb-2' : 'gap-2.5 px-3 py-2 mb-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && t('sidebar.logout')}
        </button>
        <button
          onClick={() => setProjectMenuOpen(!projectMenuOpen)}
          className={cn(
            'w-full flex items-center rounded-xl transition-colors text-left',
            collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2.5',
            projectMenuOpen ? 'bg-brand-50' : 'bg-cream hover:bg-cream-200'
          )}
        >
          {activeProject?.site_analysis?.favicon_url && !faviconError ? (
            <img
              src={activeProject.site_analysis.favicon_url}
              alt=""
              className={cn('shrink-0 rounded-lg object-contain', collapsed ? 'h-6 w-6' : 'h-7 w-7')}
              onError={() => setFaviconError(true)}
            />
          ) : (
            <div className={cn(
              'shrink-0 flex items-center justify-center rounded-lg bg-brand-100 text-brand-700 font-bold text-[11px] uppercase',
              collapsed ? 'h-6 w-6' : 'h-7 w-7'
            )}>
              {activeProject?.name?.slice(0, 2) ?? 'SP'}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink truncate leading-tight">
                  {activeProject?.name ?? t('sidebar.selectProject')}
                </p>
                <p className="text-[11px] text-ink-300 truncate leading-tight mt-0.5">
                  {activeProject?.client_domain || t('sidebar.noActiveProject')}
                </p>
              </div>
              <ChevronDown className={cn('h-3.5 w-3.5 text-ink-300 transition-transform', projectMenuOpen && 'rotate-180')} />
            </>
          )}
        </button>

        {projectMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProjectMenuOpen(false)} />

            <div className="absolute bottom-full left-3 right-3 mb-1 z-50 bg-surface rounded-xl border border-cream-200 shadow-lg max-h-[320px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-cream-200">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-200">{t('sidebar.projects')}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectMenuOpen(false);
                    navigate('/onboarding');
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
                    <p className="text-xs text-ink-300">{t('sidebar.noProject')}</p>
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
                          : 'hover:bg-cream-50'
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
                            : 'bg-cream text-ink-300'
                        )}
                        style={{ display: p.site_analysis?.favicon_url ? 'none' : 'flex' }}
                      >
                        {p.name?.slice(0, 2) ?? 'PR'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-xs truncate leading-tight',
                          p.id === activeProjectId ? 'font-semibold text-brand-700' : 'font-medium text-ink'
                        )}>
                          {p.name}
                        </p>
                        <p className="text-[10px] text-ink-300 truncate leading-tight mt-0.5">
                          {p.client_domain}
                        </p>
                      </div>
                      {p.id === activeProjectId && (
                        <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                      )}
                      <button
                        onClick={(e) => handleDeleteProject(e, p.id, p.name)}
                        className="p-1 rounded-md text-ink-100 opacity-0 group-hover/item:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        title={t('sidebar.deleteTitle')}
                        aria-label={t('sidebar.deleteTitle')}
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
    </>
  );

  return (
    <div className="grain-overlay flex h-screen overflow-hidden bg-cream">
      <a href="#main-content" className="skip-link">{t('sidebar.skipToContent', 'Skip to content')}</a>

      {/* ── Mobile header ──────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-surface border-b border-cream-200">
        <div className="flex items-center gap-2">
          <img src="/snapeous-logo.svg" alt="Snapeous" className="h-5 w-5" />
          <span className="text-sm font-bold tracking-tight text-ink">Snapeous</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-ink-500 hover:bg-cream transition-colors"
          aria-label={sidebarOpen ? t('sidebar.closeMenu', 'Close menu') : t('sidebar.openMenu', 'Open menu')}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* ── Mobile sidebar overlay ─────────────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside aria-label={t('sidebar.navigation', 'Main navigation')} className={cn(
        'shrink-0 bg-surface flex flex-col border-r border-cream-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-[220px]',
        // Mobile: slide in/out
        'fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </aside>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Upgrade Modal (global) ──────────────────────────────── */}
      <UpgradeModal />

    </div>
  );
}
