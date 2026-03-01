import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Key,
  Shield,
  Database,
  Info,
  CheckCircle,
  XCircle,
  Terminal,
  Rocket,
  Globe,
  BarChart3,
  Layers,
  Settings as SettingsIcon,
} from 'lucide-react';
import { getSettings } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader } from 'lucide-react';
import FootprintsPanel from './FootprintsPanel';

const TABS = [
  { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
  { id: 'footprints', label: 'Footprints', icon: Layers },
];

function StatusBadge({ configured }) {
  if (configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3.5 w-3.5" />
        Configuré
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
      <XCircle className="h-3.5 w-3.5" />
      Non configuré
    </span>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('settings');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          Configuration et outils de l'application
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft">
        <nav className="flex border-b border-gray-50 px-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all',
                activeTab === id
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Paramètres */}
      {activeTab === 'settings' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="h-8 w-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Read-only notice */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-5">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  Pour modifier les paramètres, éditez le fichier{' '}
                  <code className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-mono font-semibold">
                    config/.env
                  </code>{' '}
                  et redémarrez le serveur.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* OpenRouter / IA */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-violet-50 p-2.5">
                        <Key className="h-4 w-4 text-violet-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">OpenRouter / IA</h2>
                    </div>
                    <StatusBadge configured={settings?.has_ai} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">Modèle</span>
                      <span className="text-xs font-mono text-gray-900">{settings?.openrouter_model || '--'}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Utilisé pour l'analyse IA des sites. Clé dans{' '}
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">config/.env</code>
                    </p>
                  </div>
                </div>

                {/* Proxy Decodo */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-2.5">
                        <Shield className="h-4 w-4 text-blue-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">Proxy Decodo</h2>
                    </div>
                    <StatusBadge configured={settings?.has_proxy} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Utilisé pour le scraping Google. Configurez dans{' '}
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">config/.env</code>
                  </p>
                </div>

                {/* SERP API */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-indigo-50 p-2.5">
                        <Globe className="h-4 w-4 text-indigo-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">SERP API</h2>
                    </div>
                    <StatusBadge configured={settings?.has_dataforseo || settings?.has_serpapi} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">dataforSEO</span>
                      <span className={cn('text-xs font-medium', settings?.has_dataforseo ? 'text-emerald-600' : 'text-gray-400')}>
                        {settings?.has_dataforseo ? 'Configuré' : 'Non configuré'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">SerpAPI</span>
                      <span className={cn('text-xs font-medium', settings?.has_serpapi ? 'text-emerald-600' : 'text-gray-400')}>
                        {settings?.has_serpapi ? 'Configuré' : 'Non configuré'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SpeedyIndex */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-cyan-50 p-2.5">
                        <Globe className="h-4 w-4 text-cyan-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">SpeedyIndex</h2>
                    </div>
                    <StatusBadge configured={settings?.has_speedyindex} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Vérification d'indexation Google des URLs.
                  </p>
                </div>

                {/* DomDetailer */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-50 p-2.5">
                        <BarChart3 className="h-4 w-4 text-amber-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">DomDetailer</h2>
                    </div>
                    <StatusBadge configured={settings?.has_domdetailer} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Métriques de domaine (DR, UR, backlinks, domaines référents).
                  </p>
                </div>

                {/* Base de données */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="rounded-xl bg-emerald-50 p-2.5">
                      <Database className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">Base de données</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">Type</span>
                      <span className="text-xs font-mono text-gray-900">SQLite</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">Chemin</span>
                      <span className="text-xs font-mono text-gray-900">data/snapeous.db</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guide de démarrage */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-7">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-xl bg-violet-50 p-2.5">
                    <Rocket className="h-4 w-4 text-violet-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Guide de démarrage</h2>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      n: 1, title: 'Configurez config/.env',
                      desc: 'Ajoutez vos clés API dans le fichier de configuration.',
                      code: 'OPENROUTER_API_KEY=sk-or-v1-...\nDECODO_PROXY_URL=http://...',
                      isCode: true,
                    },
                    {
                      n: 2, title: 'Lancez le backend',
                      desc: 'Démarrez le serveur FastAPI.',
                      code: 'python -m uvicorn backend.main:app --reload',
                      isCode: false,
                    },
                    {
                      n: 3, title: 'Lancez le frontend',
                      desc: 'Démarrez le serveur de développement React.',
                      code: 'cd frontend && npm run dev',
                      isCode: false,
                    },
                    {
                      n: 4, title: 'Créez votre premier projet',
                      desc: 'Depuis le dashboard, cliquez sur "Nouveau projet" pour commencer.',
                      code: null,
                    },
                  ].map(({ n, title, desc, code, isCode }) => (
                    <div key={n} className="flex gap-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {n}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                        <p className="mt-1 text-xs text-gray-400">{desc}</p>
                        {code && (
                          isCode ? (
                            <pre className="mt-2 rounded-xl bg-gray-900 p-3.5 text-xs text-gray-100 overflow-x-auto">
                              <code>{code}</code>
                            </pre>
                          ) : (
                            <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3">
                              <Terminal className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <code className="text-xs text-gray-100">{code}</code>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Tab: Footprints */}
      {activeTab === 'footprints' && <FootprintsPanel />}
    </div>
  );
}
