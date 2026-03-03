import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import { useUpgradeStore } from '@/lib/api';
import Modal from '@/components/ui/Modal';

const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
};

const NEXT_PLAN = {
  free: 'starter',
  starter: 'pro',
  pro: 'agency',
};

export default function UpgradeModal() {
  const { open, limitType, limit, current, currentPlan, hide } = useUpgradeStore();
  const navigate = useNavigate();
  const { t } = useTranslation('app');

  const limitLabel = t(`upgrade.limitTypes.${limitType}`, limitType);
  const nextPlan = NEXT_PLAN[currentPlan] || 'pro';

  return (
    <Modal open={open} onClose={hide} size="sm" showClose={false}>
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>

        <h2 className="text-lg font-bold text-ink mb-2">{t('upgrade.title')}</h2>

        <p className="text-sm text-ink-400 mb-1">
          {t('upgrade.planLimitedTo', {
            plan: PLAN_LABELS[currentPlan] || currentPlan,
            limit,
            type: limitLabel,
          })}
        </p>
        <p className="text-sm text-ink-400 mb-6">
          {t('upgrade.currentUsage', { current })}
        </p>

        <button
          onClick={() => {
            hide();
            navigate('/settings', { state: { tab: 'subscription' } });
          }}
          className="w-full btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <ArrowUpRight className="h-4 w-4" />
          {t('upgrade.upgradeTo', { plan: PLAN_LABELS[nextPlan] })}
        </button>

        <button
          onClick={hide}
          className="w-full mt-2 py-2.5 text-sm font-medium text-ink-300 hover:text-ink-500 transition-colors"
        >
          {t('upgrade.later')}
        </button>
      </div>
    </Modal>
  );
}
