import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Calendar, Clock, AlertTriangle,
  CheckCircle, ExternalLink, Loader, XCircle, RefreshCw,
} from 'lucide-react';
import { cancelSubscription, reactivateSubscription, getBillingPortalUrl } from '@/lib/api';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  active:     { label: 'Actif',      color: 'bg-green-50 text-green-700 border-green-200',    icon: CheckCircle },
  trialing:   { label: 'Essai',      color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: Clock },
  past_due:   { label: 'Impayé',     color: 'bg-red-50 text-red-700 border-red-200',          icon: AlertTriangle },
  canceled:   { label: 'Annulé',     color: 'bg-surface-muted text-ink-500 border-ink-100',       icon: XCircle },
  incomplete: { label: 'Incomplet',  color: 'bg-amber-50 text-amber-700 border-amber-200',    icon: AlertTriangle },
  unpaid:     { label: 'Impayé',     color: 'bg-red-50 text-red-700 border-red-200',          icon: AlertTriangle },
};

const PLAN_LABELS = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };

export default function SubscriptionTab() {
  const { subscription, plan, limits, isTrialing, isCanceled, trialDaysLeft, refetchSubscription } = useSubscription();
  const navigate = useNavigate();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      refetchSubscription();
      toast.success('Abonnement annulé. Il reste actif jusqu\'à la fin de la période.');
      setShowCancelConfirm(false);
    },
    onError: () => toast.error('Erreur lors de l\'annulation'),
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateSubscription,
    onSuccess: () => {
      refetchSubscription();
      toast.success('Abonnement réactivé !');
    },
    onError: () => toast.error('Erreur lors de la réactivation'),
  });

  const portalMutation = useMutation({
    mutationFn: getBillingPortalUrl,
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: () => toast.error('Impossible d\'ouvrir le portail de facturation'),
  });

  const status = subscription?.status || 'active';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;
  const daysLeft = trialDaysLeft();
  const isFree = plan === 'free';

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  return (
    <div className="space-y-5">
      {/* Plan actuel */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5">
              <CreditCard className="h-4 w-4 text-brand-600" />
            </div>
            <h2 className="text-sm font-semibold text-ink">Plan actuel</h2>
          </div>
          <div className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium', statusConfig.color)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
            <span className="text-xs font-medium text-ink-300 block mb-1">Plan</span>
            <span className="text-sm font-bold text-ink">{PLAN_LABELS[plan]}</span>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
            <span className="text-xs font-medium text-ink-300 block mb-1">Projets</span>
            <span className="text-sm font-bold text-ink">
              {limits.max_domains === 999999 ? 'Illimité' : limits.max_domains}
            </span>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
            <span className="text-xs font-medium text-ink-300 block mb-1">Backlinks</span>
            <span className="text-sm font-bold text-ink">
              {limits.max_backlinks >= 25000 ? '25 000' : limits.max_backlinks.toLocaleString('fr-FR')}
            </span>
          </div>
        </div>

        {/* Trial countdown */}
        {isTrialing && daysLeft !== null && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <Clock className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700 font-medium">
              Il reste <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> d'essai gratuit.
              {daysLeft <= 3 && ' Ajoutez un moyen de paiement pour continuer.'}
            </p>
          </div>
        )}

        {/* Cancel notice */}
        {isCanceled && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              Votre abonnement sera annulé le {formatDate(subscription?.current_period_end)}.
            </p>
          </div>
        )}
      </div>

      {/* Période & dates */}
      {!isFree && (
        <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-violet-50 p-2.5">
              <Calendar className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="text-sm font-semibold text-ink">Période de facturation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
              <span className="text-xs font-medium text-ink-300 block mb-1">Début de la période</span>
              <span className="text-sm font-semibold text-ink">{formatDate(subscription?.current_period_start)}</span>
            </div>
            <div className="rounded-xl bg-surface-muted px-4 py-3 border border-ink-50/50">
              <span className="text-xs font-medium text-ink-300 block mb-1">Fin de la période</span>
              <span className="text-sm font-semibold text-ink">{formatDate(subscription?.current_period_end)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/settings', { state: { tab: 'subscription', changePlan: true } })}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            Changer de plan
          </button>

          {!isFree && subscription?.stripe_customer_id && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
            >
              {portalMutation.isPending ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Gérer la facturation
            </button>
          )}

          {!isFree && !isCanceled && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm py-2 px-4 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
            >
              Annuler l'abonnement
            </button>
          )}

          {isCanceled && (
            <button
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="text-sm py-2 px-4 text-brand-600 hover:bg-brand-50 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {reactivateMutation.isPending ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Réactiver l'abonnement
            </button>
          )}
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-ink-50 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Annuler l'abonnement ?</h3>
            <p className="text-sm text-ink-400 mb-6">
              Votre abonnement restera actif jusqu'à la fin de la période en cours.
              Vous serez ensuite rétrogradé au plan Free.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 btn-secondary py-2.5 text-sm font-medium"
              >
                Non, garder
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {cancelMutation.isPending ? <Loader className="h-4 w-4 animate-spin" /> : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
