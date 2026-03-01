import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Projects ─────────────────────────────────────────────────────────

export const getProjects = () => api.get('/projects').then(r => r.data);
export const getProject = (id) => api.get(`/projects/${id}`).then(r => r.data);
export const createProject = (data) => api.post('/projects', data).then(r => r.data);
export const updateProject = (id, data) => api.patch(`/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`).then(r => r.data);
export const analyzeProject = (id, language) => api.post(`/projects/${id}/analyze`, null, { params: language ? { language } : {} }).then(r => r.data);
export const getSitemapPages = (projectId, params) => api.get(`/projects/${projectId}/sitemap-pages`, { params }).then(r => r.data);

// ── Footprints ───────────────────────────────────────────────────────

export const getFootprints = (params) => api.get('/footprints', { params }).then(r => r.data);
export const getFootprintCategories = () => api.get('/footprints/categories').then(r => r.data);
export const createFootprint = (data) => api.post('/footprints', data).then(r => r.data);
export const deleteFootprint = (id) => api.delete(`/footprints/${id}`).then(r => r.data);
export const seedFootprints = () => api.post('/footprints/seed').then(r => r.data);

// ── Searches ─────────────────────────────────────────────────────────

export const createSearch = (data) => api.post('/search', data).then(r => r.data);
export const createSearchBulk = (data) => api.post('/search/bulk', data).then(r => r.data);
export const getSearches = (projectId) => api.get(`/projects/${projectId}/searches`).then(r => r.data);

// ── Spots ────────────────────────────────────────────────────────────

export const getSpots = (projectId, params) => api.get(`/projects/${projectId}/spots`, { params }).then(r => r.data);
export const getSpotsCount = (projectId) => api.get(`/projects/${projectId}/spots/count`).then(r => r.data);
export const updateSpot = (id, data) => api.patch(`/spots/${id}`, data).then(r => r.data);
export const qualifySpot = (id) => api.post(`/spots/${id}/qualify`).then(r => r.data);
export const deleteSpot = (id) => api.delete(`/spots/${id}`).then(r => r.data);
export const verifySpot = (id, isRelevant, reason) => api.post(`/spots/${id}/verify`, { is_relevant: isRelevant, reason }).then(r => r.data);
export const bulkUpdateSpots = (spotIds, status) => api.post('/spots/bulk-update', { spot_ids: spotIds, status }).then(r => r.data);
export const exportSpots = (projectId, params) => {
  return api.get(`/projects/${projectId}/spots/export`, { params, responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spots_export.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });
};

// ── Dashboard ────────────────────────────────────────────────────────

export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);

// ── Settings ─────────────────────────────────────────────────────────

export const getSettings = () => api.get('/settings').then(r => r.data);

// ── Backlinks ─────────────────────────────────────────────────────────

export const getBacklinks = (projectId, params) => api.get(`/projects/${projectId}/backlinks`, { params }).then(r => r.data);
export const getBacklinksCount = (projectId, params) => api.get(`/projects/${projectId}/backlinks/count`, { params }).then(r => r.data);
export const getBacklink = (projectId, id) => api.get(`/projects/${projectId}/backlinks/${id}`).then(r => r.data);
export const createBacklink = (projectId, data) => api.post(`/projects/${projectId}/backlinks`, data).then(r => r.data);
export const createBacklinksBulk = (projectId, items) => api.post(`/projects/${projectId}/backlinks/bulk`, items, { timeout: 120000 }).then(r => r.data);
export const updateBacklink = (projectId, id, data) => api.patch(`/projects/${projectId}/backlinks/${id}`, data).then(r => r.data);
export const deleteBacklink = (projectId, id) => api.delete(`/projects/${projectId}/backlinks/${id}`).then(r => r.data);
export const deleteAllBacklinks = (projectId, params) => api.delete(`/projects/${projectId}/backlinks`, { params }).then(r => r.data);
export const exportBacklinks = (projectId, params) => {
  return api.get(`/projects/${projectId}/backlinks/export`, { params, responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `backlinks_${projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });
};
export const checkBacklink = (projectId, id) => api.post(`/projects/${projectId}/backlinks/${id}/check`).then(r => r.data);
export const checkAllBacklinks = (projectId, params) => api.post(`/projects/${projectId}/backlinks/check-all`, null, { params }).then(r => r.data);
export const checkBacklinkIndexation = (projectId, id) => api.post(`/projects/${projectId}/backlinks/${id}/index-check`).then(r => r.data);
export const checkBacklinksIndexationBatch = (projectId, ids) => api.post(`/projects/${projectId}/backlinks/index-check-batch`, ids).then(r => r.data);
export const submitBacklinkForIndexation = (projectId, id) => api.post(`/projects/${projectId}/backlinks/${id}/submit-index`).then(r => r.data);
export const fetchBacklinkMetrics = (projectId, id) => api.post(`/projects/${projectId}/backlinks/${id}/metrics`).then(r => r.data);

// ── Backlinks Analytics ──────────────────────────────────────────────

export const getBacklinkStats = (projectId) => api.get(`/projects/${projectId}/backlinks/stats`).then(r => r.data);
export const getBacklinkAnchors = (projectId) => api.get(`/projects/${projectId}/backlinks/anchors`).then(r => r.data);
export const getBacklinkHistory = (projectId, params) => api.get(`/projects/${projectId}/backlinks/history`, { params }).then(r => r.data);
export const getBacklinkDomains = (projectId, params) => api.get(`/projects/${projectId}/backlinks/domains`, { params }).then(r => r.data);

export default api;
