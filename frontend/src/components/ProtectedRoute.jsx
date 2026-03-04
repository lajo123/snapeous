import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { DEFAULT_LANG } from '@/i18n';

export default function ProtectedRoute({ children, skipSubscriptionCheck = false }) {
  const { user, loading } = useAuth();
  const { subscription, isLoading: subLoading, isError: subError } = useSubscription();
  const location = useLocation();
  const { lang } = useParams();
  const currentLang = lang || DEFAULT_LANG;

  if (loading || (user && subLoading)) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: '#F0E6D8' }}>
        <div className="h-6 w-6 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${currentLang}/login`} state={{ from: location }} replace />;
  }

  // Don't redirect to choose-plan if the subscription query errored —
  // the backend auto-creates a free subscription, so errors are transient.
  // Only redirect when we have a definitive "no subscription" (query succeeded but returned nothing).
  if (!skipSubscriptionCheck && !subscription && !subError && !location.pathname.endsWith('/choose-plan')) {
    return <Navigate to={`/${currentLang}/choose-plan`} replace />;
  }

  return children;
}
