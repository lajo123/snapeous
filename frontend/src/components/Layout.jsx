import { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProject, getProjects, createProject, deleteProject } from '@/lib/api';

const PROJECT_NAV = [
  { label: 'Dashboard',  path: '',           icon: LayoutDashboard },
  { label: 'Analyse',    path: '/analysis',  icon: BarChart3 },
  { label: 'Backlinks',  path: '/backlinks', icon: Link2 },
  { label: 'Spots',      path: '/spots',     icon: Target },
];

export default function Layout() {
  const { id: routeProjectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      toast.success('Projet supprimé');
      // If we deleted the active project, navigate to root (will redirect to next project)
      if (deletedId === activeProjectId) {
        navigate('/');
      }
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleDeleteProject = (e, projectId, projectName) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer "${projectName}" ? Cette action est irréversible.`)) {
      deleteMutation.mutate(projectId);
    }
  };

  const createMutation = useMutation({
    mutationFn: () => createProject({ name: newName, client_domain: newDomain }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projet créé');
      setShowNewModal(false);
      setNewName('');
      setNewDomain('');
      navigate(`/projects/${data.id}`);
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim()) {
      toast.error('Tous les champs sont requis');
      return;
    }
    createMutation.mutate();
  };

  const switchProject = (projectId) => {
    // Keep the current sub-page (spots, analysis, etc.) when switching
    const currentSuffix = routeProjectId
      ? location.pathname.replace(`/projects/${routeProjectId}`, '')
      : '';
    const validSuffixes = ['/spots', '/analysis', '/backlinks', '/keywords', '/search'];
    const suffix = validSuffixes.includes(currentSuffix) ? currentSuffix : '';
    navigate(`/projects/${projectId}${suffix}`);
    setProjectMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F0E8' }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 bg-white flex flex-col border-r border-[#E8E0D5]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500">
            <Target className="h-[14px] w-[14px] text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-900">SpotSEO</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">

          {/* Nav projet (toujours visible si un projet est actif) */}
          {activeProjectId && PROJECT_NAV.map(({ label, path, icon: Icon }) => {
            const to = path === ''
              ? `/projects/${activeProjectId}`
              : `/projects/${activeProjectId}${path}`;

            const isActive = path === ''
              ? location.pathname === `/projects/${activeProjectId}`
              : location.pathname.startsWith(to);

            return (
              <NavLink
                key={path}
                to={to}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-[#5a5550] hover:bg-[#F5F0E8] hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            );
          })}

          {/* Message si aucun projet */}
          {!activeProjectId && (
            <div className="px-3 py-8 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-[#F5F0E8]">
                <FolderOpen className="h-6 w-6 text-[#9a9080]" />
              </div>
              <p className="mt-3 text-xs font-medium text-[#6b6560]">Aucun projet</p>
              <p className="mt-1 text-[11px] text-[#9a9080]">Créez un projet pour commencer</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Nouveau projet
              </button>
            </div>
          )}

          {/* Séparateur */}
          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#b0a898]">
              Configuration
            </span>
          </div>

          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-[#5a5550] hover:bg-[#F5F0E8] hover:text-gray-900'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Paramètres
          </NavLink>
        </nav>

        {/* ── Sélecteur de projet en bas ───────────────────────── */}
        <div className="relative px-3 pb-4 pt-2 border-t border-[#E8E0D5]">
          {/* Bouton principal */}
          <button
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors text-left',
              projectMenuOpen ? 'bg-emerald-50' : 'bg-[#F5F0E8] hover:bg-[#EDE4D3]'
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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[11px] uppercase">
                {activeProject?.name?.slice(0, 2) ?? 'SP'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                {activeProject?.name ?? 'Sélectionner un projet'}
              </p>
              <p className="text-[11px] text-[#9a9080] truncate leading-tight mt-0.5">
                {activeProject?.client_domain || 'Aucun projet actif'}
              </p>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-[#9a9080] transition-transform', projectMenuOpen && 'rotate-180')} />
          </button>

          {/* Dropdown liste de projets */}
          {projectMenuOpen && (
            <>
              {/* Overlay pour fermer */}
              <div className="fixed inset-0 z-40" onClick={() => setProjectMenuOpen(false)} />

              <div className="absolute bottom-full left-3 right-3 mb-1 z-50 bg-white rounded-xl border border-[#E8E0D5] shadow-lg max-h-[320px] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#EDE4D3]">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#b0a898]">Projets</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectMenuOpen(false);
                      setShowNewModal(true);
                    }}
                    className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Nouveau
                  </button>
                </div>

                {/* Liste */}
                <div className="overflow-y-auto flex-1">
                  {projects.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-[#9a9080]">Aucun projet</p>
                    </div>
                  ) : (
                    projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => switchProject(p.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors group/item',
                          p.id === activeProjectId
                            ? 'bg-emerald-50'
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
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-[#F5F0E8] text-[#9a9080]'
                          )}
                          style={{ display: p.site_analysis?.favicon_url ? 'none' : 'flex' }}
                        >
                          {p.name?.slice(0, 2) ?? 'PR'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'text-xs truncate leading-tight',
                            p.id === activeProjectId ? 'font-semibold text-emerald-700' : 'font-medium text-gray-900'
                          )}>
                            {p.name}
                          </p>
                          <p className="text-[10px] text-[#9a9080] truncate leading-tight mt-0.5">
                            {p.client_domain}
                          </p>
                        </div>
                        {p.id === activeProjectId && (
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        <button
                          onClick={(e) => handleDeleteProject(e, p.id, p.name)}
                          className="p-1 rounded-md text-[#c0b8ae] opacity-0 group-hover/item:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                          title="Supprimer"
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

      {/* ── Contenu ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Modal: Nouveau projet ──────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-soft-lg w-full max-w-md border border-[#E8E0D5]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDE4D3]">
              <h2 className="text-base font-bold text-gray-900">Nouveau projet</h2>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 text-[#9a9080] hover:text-gray-700 rounded-lg hover:bg-[#F5F0E8] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Nom du projet</label>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Ex : Campagne SEO Q1 2026" className="input" autoFocus required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Domaine</label>
                <input
                  type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
                  placeholder="monsite.com" className="input" required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Création...' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
