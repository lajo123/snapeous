import { Routes, Route } from 'react-router-dom';
import LanguageRedirect from './components/LanguageRedirect';
import LanguageWrapper from './components/LanguageWrapper';
import LegacyRedirect from './components/LegacyRedirect';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import ProjectAnalysis from './pages/ProjectAnalysis';
import ProjectSearch from './pages/ProjectSearch';
import ProjectSpots from './pages/ProjectSpots';
import ProjectBacklinks from './pages/ProjectBacklinks';
import ProjectKeywords from './pages/ProjectKeywords';
import Settings from './pages/Settings';
import ChoosePlan from './pages/ChoosePlan';
import LegalNotice from './pages/LegalNotice';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Gdpr from './pages/Gdpr';
import Contact from './pages/Contact';

function App() {
  return (
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

        {/* Plan selection (protected but outside Layout) */}
        <Route
          path="choose-plan"
          element={
            <ProtectedRoute skipSubscriptionCheck>
              <ChoosePlan />
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
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/analysis" element={<ProjectAnalysis />} />
          <Route path="projects/:id/search" element={<ProjectSearch />} />
          <Route path="projects/:id/spots" element={<ProjectSpots />} />
          <Route path="projects/:id/backlinks" element={<ProjectBacklinks />} />
          <Route path="projects/:id/keywords" element={<ProjectKeywords />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Backward compat: /login -> /en/login */}
      <Route path="*" element={<LegacyRedirect />} />
    </Routes>
  );
}

export default App;
