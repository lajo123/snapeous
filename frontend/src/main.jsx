import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SubscriptionProvider } from './contexts/SubscriptionContext.jsx';
import './i18n';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <SubscriptionProvider>
                <App />
                <Toaster position="top-right" richColors />
              </SubscriptionProvider>
            </QueryClientProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
);
