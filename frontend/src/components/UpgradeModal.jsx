import { useNavigate } from 'react-router-dom';
import { X, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { useUpgradeStore } from '@/lib/api';

const LIMIT_LABELS = {
  domains: 'projets',
  backlinks: 'backlinks',
};

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

  if (!open) return null;

  const limitLabel = LIMIT_LABELS[limitType] || limitType;
  const nextPlan = NEXT_PLAN[currentPlan] || 'pro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={hide} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100">
        <div className="px-6 py-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-2">Limite atteinte</h2>

          <p className="text-sm text-gray-500 mb-1">
            Votre plan <strong className="text-gray-700">{PLAN_LABELS[currentPlan] || currentPlan}</strong> est limité à{' '}
            <strong className="text-gray-700">{limit} {limitLabel}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Vous en utilisez actuellement <strong className="text-gray-700">{current}</strong>.
          </p>

          <button
            onClick={() => {
              hide();
              navigate('/settings', { state: { tab: 'subscription' } });
            }}
            className="w-full btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="h-4 w-4" />
            Passer au plan {PLAN_LABELS[nextPlan]}
          </button>

          <button
            onClick={hide}
            className="w-full mt-2 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
