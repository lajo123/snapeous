import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import ProjectAnalysis from './pages/ProjectAnalysis';
import ProjectSearch from './pages/ProjectSearch';
import ProjectSpots from './pages/ProjectSpots';
import ProjectBacklinks from './pages/ProjectBacklinks';
import ProjectKeywords from './pages/ProjectKeywords';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Root redirects to first project */}
        <Route path="/" element={<Dashboard />} />

        {/* Project pages */}
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/analysis" element={<ProjectAnalysis />} />
        <Route path="/projects/:id/search" element={<ProjectSearch />} />
        <Route path="/projects/:id/spots" element={<ProjectSpots />} />
        <Route path="/projects/:id/backlinks" element={<ProjectBacklinks />} />
        <Route path="/projects/:id/keywords" element={<ProjectKeywords />} />

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
