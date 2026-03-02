import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader, CreditCard, X, Sparkles, Shield } from 'lucide-react';
import { stripePromise } from '@/lib/stripe';
import { createSetupIntent, subscribe } from '@/lib/api';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'free', label: 'Free', monthlyPrice: 0, annualPrice: 0,
    desc: 'Pour découvrir Snapeous',
    features: ['1 projet', '50 backlinks monitorés', 'Dashboard basique', 'Alertes email basiques'],
  },
  {
    id: 'starter', label: 'Starter', monthlyPrice: 19, annualPrice: 15,
    desc: 'Pour les indépendants',
    features: ['3 projets', '500 backlinks monitorés', 'Analyse complète', 'Détection liens toxiques', 'Export CSV', 'Alertes email complètes'],
  },
  {
    id: 'pro', label: 'Pro', monthlyPrice: 49, annualPrice: 39, recommended: true,
    desc: 'Pour les freelances & équipes',
    features: ['10 projets', '5 000 backlinks monitorés', 'Tout du Starter', 'Recommandations IA', '3 concurrents', 'Rapports PDF', 'Intégration GSC', 'Accès API'],
  },
  {
    id: 'agency', label: 'Agency', monthlyPrice: 99, annualPrice: 79,
    desc: 'Pour les agences SEO',
    features: ['Projets illimités', '25 000 backlinks monitorés', 'Tout du Pro', 'Concurrents illimités', 'Sous-comptes', 'Rapports planifiés', 'Support prioritaire', 'API avancée'],
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
      // 1. Create SetupIntent
      const { client_secret } = await createSetupIntent();

      // 2. Confirm card setup
      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      // 3. Create subscription
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
              <h2 className="text-base font-bold text-gray-900">S'abonner au plan {plan.label}</h2>
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
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Traitement...
              </>
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

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { refetchSubscription } = useSubscription();
  const [interval, setInterval] = useState('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  const freeMutation = useMutation({
    mutationFn: () => subscribe({ plan: 'free' }),
    onSuccess: () => {
      refetchSubscription();
      toast.success('Plan Free activé !');
      navigate('/dashboard');
    },
    onError: () => toast.error('Erreur lors de l\'activation'),
  });

  const handleSelectPlan = (planId) => {
    if (planId === 'free') {
      freeMutation.mutate();
    } else {
      setCheckoutPlan(planId);
    }
  };

  const handleCheckoutSuccess = () => {
    setCheckoutPlan(null);
    refetchSubscription();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0E6D8' }}>
      {/* Header */}
      <div className="py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <img src="/snapeous-logo.svg" alt="Snapeous" className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight text-[#2A2A2A]">Snapeous</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Choisissez votre plan
        </h1>
        <p className="text-sm text-gray-500 font-medium max-w-lg mx-auto">
          Commencez gratuitement ou démarrez un essai de 7 jours sur nos plans payants. Aucun engagement.
        </p>

        {/* Toggle mensuel/annuel */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setInterval('monthly')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all',
              interval === 'monthly'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setInterval('annual')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
              interval === 'annual'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Annuel
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">-20%</span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="flex-1 px-6 pb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const price = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const isFree = plan.id === 'free';

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative bg-white rounded-2xl border p-6 flex flex-col transition-all',
                  plan.recommended
                    ? 'border-brand-300 shadow-lg shadow-brand-100/50 ring-1 ring-brand-200'
                    : 'border-gray-100 shadow-soft hover:shadow-md'
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recommandé
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.desc}</p>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-gray-900">
                    {isFree ? 'Gratuit' : `${price}€`}
                  </span>
                  {!isFree && (
                    <span className="text-sm text-gray-400 font-medium">/mois</span>
                  )}
                  {!isFree && interval === 'annual' && (
                    <p className="text-[11px] text-brand-600 font-medium mt-1">
                      Facturé {price * 12}€/an
                    </p>
                  )}
                </div>

                {!isFree && (
                  <div className="rounded-lg bg-brand-50/80 border border-brand-100 px-3 py-2 mb-5">
                    <p className="text-[11px] text-brand-700 font-semibold flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      7 jours d'essai gratuit
                    </p>
                  </div>
                )}

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={freeMutation.isPending}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                    plan.recommended
                      ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-200/50'
                      : isFree
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
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
