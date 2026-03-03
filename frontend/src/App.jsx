import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LanguageRedirect from './components/LanguageRedirect';
import LanguageWrapper from './components/LanguageWrapper';
import LegacyRedirect from './components/LegacyRedirect';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ── Lazy-loaded pages (route-based code splitting) ──────────────
// Public
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Content & Marketing
const Blog = lazy(() => import('./pages/Blog'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Docs = lazy(() => import('./pages/Docs'));

// Legal
const LegalNotice = lazy(() => import('./pages/LegalNotice'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Gdpr = lazy(() => import('./pages/Gdpr'));
const Contact = lazy(() => import('./pages/Contact'));

// Auth – outside Layout
const ChoosePlan = lazy(() => import('./pages/ChoosePlan'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

// App
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ProjectAnalysis = lazy(() => import('./pages/ProjectAnalysis'));
const ProjectSearch = lazy(() => import('./pages/ProjectSearch'));
const ProjectSpots = lazy(() => import('./pages/ProjectSpots'));
const ProjectBacklinks = lazy(() => import('./pages/ProjectBacklinks'));
const ProjectKeywords = lazy(() => import('./pages/ProjectKeywords'));
const ProjectNew = lazy(() => import('./pages/ProjectNew'));
const Settings = lazy(() => import('./pages/Settings'));

// 404
const NotFound = lazy(() => import('./pages/NotFound'));

// ── Loading fallback ────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root: detect language and redirect */}
        <Route path="/" element={<LanguageRedirect />} />

        {/* All routes under /:lang */}
        <Route path="/:lang" element={<LanguageWrapper />}>
          {/* Public routes */}
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* Legal pages */}
          <Route path="legal-notice" element={<LegalNotice />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="gdpr" element={<Gdpr />} />

          {/* Contact */}
          <Route path="contact" element={<Contact />} />

          {/* Content & Marketing */}
          <Route path="blog" element={<Blog />} />
          <Route path="changelog" element={<Changelog />} />
          <Route path="docs" element={<Docs />} />

          {/* Plan selection (protected but outside Layout) */}
          <Route
            path="choose-plan"
            element={
              <ProtectedRoute skipSubscriptionCheck>
                <ChoosePlan />
              </ProtectedRoute>
            }
          />

          {/* Onboarding wizard (protected but outside Layout) */}
          <Route
            path="onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />

            {/* Project pages */}
            <Route path="projects/new" element={<ProjectNew />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:id/analysis" element={<ProjectAnalysis />} />
            <Route path="projects/:id/search" element={<ProjectSearch />} />
            <Route path="projects/:id/spots" element={<ProjectSpots />} />
            <Route path="projects/:id/backlinks" element={<ProjectBacklinks />} />
            <Route path="projects/:id/keywords" element={<ProjectKeywords />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 within language context */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Backward compat: /login -> /en/login */}
        <Route path="*" element={<LegacyRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default App;
