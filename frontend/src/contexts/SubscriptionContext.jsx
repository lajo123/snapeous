import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { getSubscription } from '@/lib/api';

const PLAN_LIMITS = {
  free:    { label: 'Free',    max_domains: 1,      max_backlinks: 50,    check_frequency: 'weekly',   data_retention_days: 30 },
  starter: { label: 'Starter', max_domains: 3,      max_backlinks: 500,   check_frequency: 'daily',    data_retention_days: 180 },
  pro:     { label: 'Pro',     max_domains: 10,     max_backlinks: 5000,  check_frequency: 'realtime', data_retention_days: 365 },
  agency:  { label: 'Agency',  max_domains: 999999, max_backlinks: 25000, check_frequency: 'realtime', data_retention_days: 999999 },
};

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
    enabled: !!user,
    staleTime: 60000,
    retry: 1,
  });

  const queryClient = useQueryClient();
  const refetchSubscription = () => queryClient.invalidateQueries({ queryKey: ['subscription'] });

  const plan = subscription?.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const isTrialing = subscription?.status === 'trialing';
  const isCanceled = subscription?.cancel_at_period_end === true;
  const isPastDue = subscription?.status === 'past_due';

  const hasFeature = (feature) => {
    // Features are checked server-side, but we can provide quick UI hints
    return true;
  };

  const trialDaysLeft = () => {
    if (!isTrialing || !subscription?.trial_end) return null;
    const end = new Date(subscription.trial_end);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        limits,
        isLoading,
        isTrialing,
        isCanceled,
        isPastDue,
        hasFeature,
        trialDaysLeft,
        refetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
