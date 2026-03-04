import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard, Calendar, Clock, AlertTriangle,
  CheckCircle, ExternalLink, Loader, XCircle, RefreshCw, ArrowRight, Sparkles,
} from 'lucide-react';
import { cancelSubscription, reactivateSubscription, getBillingPortalUrl } from '@/lib/api';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { DEFAULT_LANG } from '@/i18n';
import { cn } from '@/lib/utils';

const PLAN_LABELS = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };
const PLAN_ORDER = ['free', 'starter', 'pro', 'agency'];

export default function SubscriptionTab() {
  const { t } = useTranslation('app');
  const { t: tPricing } = useTranslation('pricing');
  const { subscription, plan, limits, isTrialing, isCanceled, trialDaysLeft, refetchSubscription } = useSubscription();
  const navigate = useNavigate();
  const { lang } = useParams();
  const currentLang = lang || DEFAULT_LANG;
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      refetchSubscription();
      toast.success(t('settings.subscription.cancelSuccess'));
      setShowCancelConfirm(false);
    },
    onError: () => toast.error(t('settings.subscription.cancelError')),
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateSubscription,
    onSuccess: () => {
      refetchSubscription();
      toast.success(t('settings.subscription.reactivateSuccess'));
    },
    onError: () => toast.error(t('settings.subscription.reactivateError')),
  });

  const portalMutation = useMutation({
    mutationFn: getBillingPortalUrl,
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: () => toast.error(t('settings.subscription.portalError')),
  });

  const status = subscription?.status || 'active';
  const statusLabel = t(`settings.subscription.status.${status}`, status);
  const StatusIcon = {
    active: CheckCircle,
    trialing: Clock,
    past_due: AlertTriangle,
    canceled: XCircle,
    incomplete: AlertTriangle,
    unpaid: AlertTriangle,
  }[status] || CheckCircle;

  const statusColor = {
    active: 'bg-green-50 text-green-700 border-green-200',
    trialing: 'bg-blue-50 text-blue-700 border-blue-200',
    past_due: 'bg-red-50 text-red-700 border-red-200',
    canceled: 'bg-surface-muted text-ink-500 border-ink-100',
    incomplete: 'bg-amber-50 text-amber-700 border-amber-200',
    unpaid: 'bg-red-50 text-red-700 border-red-200',
  }[status] || 'bg-green-50 text-green-700 border-green-200';

  const daysLeft = trialDaysLeft();
  const isFree = plan === 'free';
  const nextPlan = PLAN_ORDER[PLAN_ORDER.indexOf(plan) + 1];

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5">
              <CreditCard className="h-4 w-4 text-brand-600" />
            </div>
            <h2 className="text-sm font-semibold text-ink">{t('settings.subscription.currentPlan')}</h2>
          </div>
          <div className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium', statusColor)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
            <span className="text-xs font-medium text-ink-300 block mb-1">{t('settings.subscription.plan')}</span>
            <span className="text-sm font-bold text-ink">{PLAN_LABELS[plan]}</span>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
            <span className="text-xs font-medium text-ink-300 block mb-1">{t('settings.subscription.projects')}</span>
            <span className="text-sm font-bold text-ink">
              {limits.max_domains === 999999 ? t('settings.subscription.unlimited') : limits.max_domains}
            </span>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
            <span className="text-xs font-medium text-ink-300 block mb-1">{t('settings.subscription.backlinks')}</span>
            <span className="text-sm font-bold text-ink">
              {limits.max_backlinks >= 25000 ? '25 000' : limits.max_backlinks.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Trial countdown */}
        {isTrialing && daysLeft !== null && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <Clock className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700 font-medium">
              {t('settings.subscription.trialCountdown', { days: daysLeft })}
              {daysLeft <= 3 && t('settings.subscription.trialWarning')}
            </p>
          </div>
        )}

        {/* Cancel notice */}
        {isCanceled && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              {t('settings.subscription.cancelNotice', { date: formatDate(subscription?.current_period_end) })}
            </p>
          </div>
        )}
      </div>

      {/* Billing period */}
      {!isFree && (
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-violet-50 p-2.5">
              <Calendar className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="text-sm font-semibold text-ink">{t('settings.subscription.billingPeriod')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
              <span className="text-xs font-medium text-ink-300 block mb-1">{t('settings.subscription.periodStart')}</span>
              <span className="text-sm font-semibold text-ink">{formatDate(subscription?.current_period_start)}</span>
            </div>
            <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
              <span className="text-xs font-medium text-ink-300 block mb-1">{t('settings.subscription.periodEnd')}</span>
              <span className="text-sm font-semibold text-ink">{formatDate(subscription?.current_period_end)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">{t('settings.subscription.actions')}</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`/${currentLang}/choose-plan`)}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            {t('settings.subscription.changePlan')}
          </button>

          {!isFree && subscription?.stripe_customer_id && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
            >
              {portalMutation.isPending ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              {t('settings.subscription.manageBilling')}
            </button>
          )}

          {!isFree && !isCanceled && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm py-2 px-4 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
            >
              {t('settings.subscription.cancelSubscription')}
            </button>
          )}

          {isCanceled && (
            <button
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="text-sm py-2 px-4 text-brand-600 hover:bg-brand-50 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {reactivateMutation.isPending ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {t('settings.subscription.reactivate')}
            </button>
          )}
        </div>
      </div>

      {/* Upgrade upsell card */}
      {nextPlan && (
        <div className="bg-gradient-to-br from-brand-50 to-violet-50 rounded-xl border border-brand-100 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-brand-100 p-2.5">
              <Sparkles className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {t('settings.subscription.upgradeTitle', { plan: PLAN_LABELS[nextPlan] })}
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                {t('settings.subscription.upgradeDesc', { plan: PLAN_LABELS[nextPlan] })}
              </p>
            </div>
          </div>

          <ul className="space-y-2 mb-5">
            {(tPricing(`plans.${nextPlan}.features`, { returnObjects: true }) || []).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                <span className="text-brand-500 mt-0.5">&#10003;</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate(`/${currentLang}/choose-plan`)}
            className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {t('settings.subscription.upgradeCta', { plan: PLAN_LABELS[nextPlan] })}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-ink-50 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">{t('settings.subscription.cancelConfirmTitle')}</h3>
            <p className="text-sm text-ink-400 mb-6">
              {t('settings.subscription.cancelConfirmDesc')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 btn-secondary py-2.5 text-sm font-medium"
              >
                {t('settings.subscription.cancelKeep')}
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {cancelMutation.isPending ? <Loader className="h-4 w-4 animate-spin" /> : t('settings.subscription.cancelConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
