import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  CreditCard,
  Settings as SettingsIcon,
} from 'lucide-react';
import { getSettings } from '@/lib/api';
import { cn } from '@/lib/utils';
import SEOHead from '@/components/SEOHead';
import { Loader } from 'lucide-react';
import FootprintsPanel from './FootprintsPanel';
import SubscriptionTab from '@/components/settings/SubscriptionTab';

export default function Settings() {
  const { t } = useTranslation('app');
  const tc = useTranslation('common').t;
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'subscription');

  const TABS = [
    { id: 'subscription', label: t('settings.tabs.subscription'), icon: CreditCard },
    { id: 'settings', label: t('settings.tabs.settings'), icon: SettingsIcon },
    { id: 'footprints', label: t('settings.tabs.footprints'), icon: Layers },
  ];

  // Allow navigating to a specific tab via location state
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  function StatusBadge({ configured }) {
    if (configured) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
          <CheckCircle className="h-3.5 w-3.5" />
          {tc('configured')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
        <XCircle className="h-3.5 w-3.5" />
        {tc('notConfigured')}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <SEOHead pageKey="settings" />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          {t('settings.subtitle')}
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
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Subscription */}
      {activeTab === 'subscription' && <SubscriptionTab />}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="h-8 w-8 text-brand-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Read-only notice */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-5">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  {t('settings.readOnlyNotice').split('<code>').map((part, i) => {
                    if (i === 0) return part;
                    const [code, rest] = part.split('</code>');
                    return (
                      <span key={i}>
                        <code className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-mono font-semibold">{code}</code>
                        {rest}
                      </span>
                    );
                  })}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* OpenRouter / AI */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-violet-50 p-2.5">
                        <Key className="h-4 w-4 text-violet-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">{t('settings.openrouterTitle')}</h2>
                    </div>
                    <StatusBadge configured={settings?.has_ai} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">{t('settings.openrouterModel')}</span>
                      <span className="text-xs font-mono text-gray-900">{settings?.openrouter_model || '--'}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {t('settings.openrouterDesc').split('<code>').map((part, i) => {
                        if (i === 0) return part;
                        const [code, rest] = part.split('</code>');
                        return (
                          <span key={i}>
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">{code}</code>
                            {rest}
                          </span>
                        );
                      })}
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
                      <h2 className="text-sm font-semibold text-gray-900">{t('settings.proxyTitle')}</h2>
                    </div>
                    <StatusBadge configured={settings?.has_proxy} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('settings.proxyDesc').split('<code>').map((part, i) => {
                      if (i === 0) return part;
                      const [code, rest] = part.split('</code>');
                      return (
                        <span key={i}>
                          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">{code}</code>
                          {rest}
                        </span>
                      );
                    })}
                  </p>
                </div>

                {/* SERP API */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-indigo-50 p-2.5">
                        <Globe className="h-4 w-4 text-indigo-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">{t('settings.serpTitle')}</h2>
                    </div>
                    <StatusBadge configured={settings?.has_dataforseo || settings?.has_serpapi} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">dataforSEO</span>
                      <span className={cn('text-xs font-medium', settings?.has_dataforseo ? 'text-brand-600' : 'text-gray-400')}>
                        {settings?.has_dataforseo ? tc('configured') : tc('notConfigured')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">SerpAPI</span>
                      <span className={cn('text-xs font-medium', settings?.has_serpapi ? 'text-brand-600' : 'text-gray-400')}>
                        {settings?.has_serpapi ? tc('configured') : tc('notConfigured')}
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
                      <h2 className="text-sm font-semibold text-gray-900">{t('settings.speedyindexTitle')}</h2>
                    </div>
                    <StatusBadge configured={settings?.has_speedyindex} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('settings.speedyindexDesc')}
                  </p>
                </div>

                {/* DomDetailer */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-50 p-2.5">
                        <BarChart3 className="h-4 w-4 text-amber-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">{t('settings.domdetailerTitle')}</h2>
                    </div>
                    <StatusBadge configured={settings?.has_domdetailer} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('settings.domdetailerDesc')}
                  </p>
                </div>

                {/* Database */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="rounded-xl bg-brand-50 p-2.5">
                      <Database className="h-4 w-4 text-brand-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">{t('settings.databaseTitle')}</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">{t('settings.databaseType')}</span>
                      <span className="text-xs font-mono text-gray-900">SQLite</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">{t('settings.databasePath')}</span>
                      <span className="text-xs font-mono text-gray-900">data/snapeous.db</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Getting started guide */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-7">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-xl bg-violet-50 p-2.5">
                    <Rocket className="h-4 w-4 text-violet-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">{t('settings.guideTitle')}</h2>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      n: 1, title: t('settings.guideStep1Title'),
                      desc: t('settings.guideStep1Desc'),
                      code: 'OPENROUTER_API_KEY=sk-or-v1-...\nDECODO_PROXY_URL=http://...',
                      isCode: true,
                    },
                    {
                      n: 2, title: t('settings.guideStep2Title'),
                      desc: t('settings.guideStep2Desc'),
                      code: 'python -m uvicorn backend.main:app --reload',
                      isCode: false,
                    },
                    {
                      n: 3, title: t('settings.guideStep3Title'),
                      desc: t('settings.guideStep3Desc'),
                      code: 'cd frontend && npm run dev',
                      isCode: false,
                    },
                    {
                      n: 4, title: t('settings.guideStep4Title'),
                      desc: t('settings.guideStep4Desc'),
                      code: null,
                    },
                  ].map(({ n, title, desc, code, isCode }) => (
                    <div key={n} className="flex gap-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
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
