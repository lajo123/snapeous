import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, User, Layers, SlidersHorizontal, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEOHead from '@/components/SEOHead';
import SubscriptionTab from '@/components/settings/SubscriptionTab';
import AccountTab from '@/components/settings/AccountTab';
import PreferencesTab from '@/components/settings/PreferencesTab';
import FootprintsPanel from './FootprintsPanel';
import { useSubscription } from '@/contexts/SubscriptionContext';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';

const PREMIUM_PLANS = ['pro', 'agency'];

export default function Settings() {
  const { t } = useTranslation('app');
  const location = useLocation();
  const { plan } = useSubscription();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'subscription');

  const hasPremiumAccess = PREMIUM_PLANS.includes(plan);

  const TABS = [
    { id: 'subscription', label: t('settings.tabs.subscription'), icon: CreditCard },
    { id: 'account', label: t('settings.tabs.account'), icon: User },
    { id: 'footprints', label: t('settings.tabs.footprints'), icon: Layers },
    { id: 'preferences', label: t('settings.tabs.preferences'), icon: SlidersHorizontal },
  ];

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  return (
    <div className="space-y-6">
      <SEOHead pageKey="settings" />
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('settings.title')}</h1>
        <p className="mt-1.5 text-sm text-ink-300">{t('settings.subtitle')}</p>
      </div>

      <div className="bg-white rounded-xl border border-ink-50 shadow-soft">
        <nav className="flex border-b border-ink-50/50 px-2 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                activeTab === id
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-ink-300 hover:text-ink-600 hover:border-ink-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'subscription' && <SubscriptionTab />}
      {activeTab === 'account' && <AccountTab />}
      {activeTab === 'footprints' && (
        hasPremiumAccess ? <FootprintsPanel /> : <FootprintsPremiumGate />
      )}
      {activeTab === 'preferences' && <PreferencesTab />}
    </div>
  );
}

/* ── Premium gate for Footprints tab ───────────────────────────────── */

function FootprintsPremiumGate() {
  const { t } = useTranslation('app');
  const navigate = useLocalizedNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-brand-100 flex items-center justify-center mb-6">
          <Lock className="h-7 w-7 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">
          {t('footprints.premiumTitle')}
        </h2>
        <p className="text-sm text-ink-400 leading-relaxed mb-8">
          {t('footprints.premiumDesc')}
        </p>
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-5 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              {t('footprints.premiumIncluded')}
            </span>
          </div>
          <ul className="space-y-2">
            {(t('footprints.premiumFeatures', { returnObjects: true }) || []).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                <span className="text-brand-500 mt-0.5">&#10003;</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => navigate('/choose-plan')}
          className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          {t('footprints.premiumUpgrade')}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
