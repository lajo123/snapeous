import { useTranslation } from 'react-i18next';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';
import SEOHead from '@/components/SEOHead';
import FootprintsPanel from './FootprintsPanel';

const PREMIUM_PLANS = ['pro', 'agency'];

export default function Footprints() {
  const { plan } = useSubscription();
  const { t } = useTranslation('app');
  const navigate = useLocalizedNavigate();

  const hasPremiumAccess = PREMIUM_PLANS.includes(plan);

  if (!hasPremiumAccess) {
    return (
      <div className="space-y-6">
        <SEOHead pageKey="footprints" />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-brand-100 flex items-center justify-center mb-6">
              <Lock className="h-7 w-7 text-violet-600" />
            </div>

            <h1 className="text-2xl font-bold text-ink mb-2">
              {t('footprints.premiumTitle')}
            </h1>
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
      </div>
    );
  }

  return (
    <>
      <SEOHead pageKey="footprints" />
      <FootprintsPanel />
    </>
  );
}
