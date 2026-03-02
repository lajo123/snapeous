import { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader, CreditCard, X, Sparkles, Shield } from 'lucide-react';
import { stripePromise } from '@/lib/stripe';
import { createSetupIntent, subscribe } from '@/lib/api';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'free', label: 'Free', monthlyPrice: 0, annualPrice: 0,
    desc: 'Pour découvrir',
    features: ['1 projet', '50 backlinks', 'Dashboard basique', 'Alertes basiques'],
  },
  {
    id: 'starter', label: 'Starter', monthlyPrice: 19, annualPrice: 15,
    desc: 'Indépendants',
    features: ['3 projets', '500 backlinks', 'Analyse complète', 'Liens toxiques', 'Export CSV', 'Alertes complètes'],
  },
  {
    id: 'pro', label: 'Pro', monthlyPrice: 49, annualPrice: 39, recommended: true,
    desc: 'Freelances & équipes',
    features: ['10 projets', '5 000 backlinks', 'Tout Starter +', 'Recommandations IA', '3 concurrents', 'Rapports PDF', 'Intégration GSC', 'Accès API'],
  },
  {
    id: 'agency', label: 'Agency', monthlyPrice: 99, annualPrice: 79,
    desc: 'Agences SEO',
    features: ['Projets illimités', '25 000 backlinks', 'Tout Pro +', 'Concurrents illimités', 'Sous-comptes', 'Rapports planifiés', 'Support prioritaire', 'API avancée'],
  },
];

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#2A2A2A',
      '::placeholder': { color: '#9a9080' },
    },
    invalid: { color: '#ef4444' },
  },
};

/* ── Checkout Modal ────────────────────────────────────────── */

function CheckoutForm({ selectedPlan, interval, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    try {
      const { client_secret } = await createSetupIntent();
      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      await subscribe({
        plan: selectedPlan,
        interval,
        payment_method_id: setupIntent.payment_method,
        email: user?.email,
      });

      toast.success('Abonnement activé ! Essai gratuit de 7 jours.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS.find(p => p.id === selectedPlan);
  const price = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5">
              <CreditCard className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Plan {plan.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{price}€/{interval === 'annual' ? 'mois (facturé annuellement)' : 'mois'}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-2 rounded-xl bg-brand-50/80 border border-brand-100 px-4 py-3">
            <Shield className="h-4 w-4 text-brand-600 shrink-0" />
            <p className="text-xs text-brand-700 font-medium">7 jours d'essai gratuit. Annulez à tout moment.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Carte bancaire</label>
            <div className="border border-gray-200 rounded-xl px-4 py-3.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
              <CardElement options={CARD_STYLE} />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full btn-primary py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader className="h-4 w-4 animate-spin" />Traitement...</>
            ) : (
              <>Démarrer l'essai gratuit</>
            )}
          </button>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            En vous abonnant, vous acceptez nos conditions d'utilisation.
            Vous ne serez pas débité pendant les 7 jours d'essai.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */

export default function ChoosePlan() {
  const navigate = useLocalizedNavigate();
  const { refetchSubscription } = useSubscription();
  const [interval, setInterval] = useState('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  const freeMutation = useMutation({
    mutationFn: () => subscribe({ plan: 'free' }),
    onSuccess: async () => {
      await refetchSubscription();
      toast.success('Plan Free activé !');
      navigate('/dashboard');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Erreur lors de l\'activation'),
  });

  const handleSelectPlan = (planId) => {
    if (planId === 'free') freeMutation.mutate();
    else setCheckoutPlan(planId);
  };

  const handleCheckoutSuccess = async () => {
    setCheckoutPlan(null);
    await refetchSubscription();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-x-hidden grain-bg">
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-brand-200/25 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[350px] h-[350px] bg-cream-200/40 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="shrink-0 relative z-10 pt-5 sm:pt-6 pb-3 sm:pb-4 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2.5">
          <img src="/snapeous-logo.svg" alt="Snapeous" className="h-6 w-6" />
          <span className="text-base font-bold tracking-tight text-[#2A2A2A]">Snapeous</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2A2A2A] mb-1">
          Choisissez votre plan
        </h1>
        <p className="text-xs text-[#6b6560] mb-3.5">
          7 jours d'essai gratuit sur les plans payants &middot; Sans engagement
        </p>

        {/* Toggle mensuel / annuel */}
        <div className="inline-flex items-center bg-white/60 backdrop-blur-sm rounded-full p-1 border border-[#D6CEC2]/50 shadow-soft">
          <button
            onClick={() => setInterval('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
              interval === 'monthly'
                ? 'bg-white shadow-sm text-[#2A2A2A]'
                : 'text-[#6b6560] hover:text-[#2A2A2A]'
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setInterval('annual')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5',
              interval === 'annual'
                ? 'bg-white shadow-sm text-[#2A2A2A]'
                : 'text-[#6b6560] hover:text-[#2A2A2A]'
            )}
          >
            Annuel
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full leading-none">
              -20%
            </span>
          </button>
        </div>
      </header>

      {/* ── Plans Grid ───────────────────────────────────────── */}
      <div className="flex-1 flex items-start md:items-center justify-center px-3 md:px-4 py-4 relative z-10">
        <div
          className={cn(
            /* Mobile: horizontal scroll */
            'flex gap-3 overflow-x-auto snap-x snap-mandatory',
            'pb-2 -mx-1 px-1 scrollbar-hide',
            /* Tablet + Desktop: 4 cols single row */
            'md:grid md:grid-cols-4 md:overflow-visible md:snap-none md:mx-0 md:px-0 md:pb-0',
            'max-w-[1080px] w-full',
          )}
        >
          {PLANS.map((plan) => {
            const price = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const isFree = plan.id === 'free';

            return (
              <div
                key={plan.id}
                className={cn(
                  /* Mobile: fixed width for scroll */
                  'snap-center shrink-0 w-[72vw] md:w-auto md:shrink',
                  /* Card base */
                  'relative bg-white/95 backdrop-blur-sm rounded-2xl border flex flex-col',
                  'p-4 md:p-3.5 lg:p-5 transition-all duration-200',
                  plan.recommended
                    ? 'border-brand-300 shadow-lg shadow-brand-100/50 ring-1 ring-brand-200'
                    : 'border-[rgba(0,0,0,0.07)] shadow-soft hover:shadow-md hover:border-[rgba(0,0,0,0.12)]'
                )}
              >
                {/* Recommended badge */}
                {plan.recommended && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <Sparkles className="h-2.5 w-2.5" />
                    Recommandé
                  </div>
                )}

                {/* Plan name + desc */}
                <div className="mb-3">
                  <h3 className="text-base font-bold text-[#2A2A2A]">{plan.label}</h3>
                  <p className="text-[11px] text-[#9a9080] mt-0.5">{plan.desc}</p>
                </div>

                {/* Price */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-[28px] font-bold text-[#2A2A2A] leading-none">
                      {isFree ? 'Gratuit' : `${price}€`}
                    </span>
                    {!isFree && (
                      <span className="text-xs text-[#9a9080] font-medium">/mois</span>
                    )}
                  </div>
                  {!isFree && interval === 'annual' && (
                    <p className="text-[10px] text-brand-600 font-medium mt-1">
                      Facturé {price * 12}€/an
                    </p>
                  )}
                </div>

                {/* Trial badge - paid plans only */}
                {!isFree && (
                  <div className="rounded-lg bg-brand-50/80 border border-brand-100 px-2.5 py-1.5 mb-3">
                    <p className="text-[10px] text-brand-700 font-semibold flex items-center gap-1">
                      <Shield className="h-3 w-3 shrink-0" />
                      7 jours d'essai gratuit
                    </p>
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-[#4a4a4a]">
                      <Check className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-px" strokeWidth={2.5} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={freeMutation.isPending}
                  className={cn(
                    'w-full py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                    plan.recommended
                      ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-200/40 hover:shadow-glow'
                      : isFree
                        ? 'bg-[#F5F2ED] text-[#4a4a4a] hover:bg-[#EBE7E0]'
                        : 'bg-[#2A2A2A] text-white hover:bg-[#1a1a1a]'
                  )}
                >
                  {isFree
                    ? (freeMutation.isPending ? 'Activation...' : 'Commencer gratuitement')
                    : 'Démarrer l\'essai gratuit'
                  }
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout modal */}
      {checkoutPlan && (
        <Elements stripe={stripePromise}>
          <CheckoutForm
            selectedPlan={checkoutPlan}
            interval={interval}
            onSuccess={handleCheckoutSuccess}
            onCancel={() => setCheckoutPlan(null)}
          />
        </Elements>
      )}
    </div>
  );
}
