import axios from 'axios';

const api = axios.create({ baseURL: 'https://mmserver.g4intl.com/api' });


// Attach JWT token
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mm_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Redirect only if logged-in API fails, not login request
api.interceptors.response.use(
  r => r,
  err => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');

    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('mm_token');
      localStorage.removeItem('mm_user');
      window.location.href = '/';
    }

    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────
export const login = (username, password) => api.post('/auth/login', { username, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);

// ── Users ──────────────────────────────────
export const getUsers = () => api.get('/users').then(r => r.data);
export const createUser = (data) => api.post('/users', data).then(r => r.data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then(r => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then(r => r.data);

// ── Activity ───────────────────────────────
export const getActivity = (params) => api.get('/activity', { params }).then(r => r.data);

// ── Settings ───────────────────────────────
export const getHeads = (type) => api.get(`/settings/${type}`).then(r => r.data);
export const createHead = (type, name, unit) => api.post(`/settings/${type}`, { name, unit }).then(r => r.data);
export const updateHead = (type, id, data) => api.put(`/settings/${type}/${id}`, data).then(r => r.data);
export const deleteHead = (type, id) => api.delete(`/settings/${type}/${id}`).then(r => r.data);

// ── Entries ────────────────────────────────
export const getEntries = (month) => api.get('/entries', { params: month ? { month } : {} }).then(r => r.data);
export const getEntry = (date) => api.get(`/entries/${date}`).then(r => r.data);
export const saveEntry = (data) => api.post('/entries', data).then(r => r.data);
export const deleteEntry = (id) => api.delete(`/entries/${id}`).then(r => r.data);

// ── Inventory ──────────────────────────────
export const getInventory = (params) => api.get('/inventory', { params }).then(r => r.data);
export const getStock = () => api.get('/inventory/stock').then(r => r.data);
export const getPriceHistory = () => api.get('/inventory/price-history').then(r => r.data);
export const addInventoryTx = (data) => api.post('/inventory', data).then(r => r.data);
export const deleteInventoryTx = (id) => api.delete(`/inventory/${id}`).then(r => r.data);

// ── Reports JSON ───────────────────────────
export const getDailyReport = (date) => api.get(`/reports/daily/${date}`).then(r => r.data);
export const getMonthlyReport = (month) => api.get(`/reports/monthly/${month}`).then(r => r.data);
export const getInventoryDailyReport = (date) => api.get(`/reports/inventory/daily/${date}`).then(r => r.data);
export const getInventoryMonthlyReport = (month) => api.get(`/reports/inventory/monthly/${month}`).then(r => r.data);

// ── PDF / CSV / HTML Downloads ─────────────
const base = import.meta.env.VITE_API_URL || '/api';
const token = () => localStorage.getItem('mm_token') || '';

export const downloadDailyPDF = (date) =>
  window.open(`${base}/reports/daily/${date}/pdf?token=${token()}`, '_blank');
export const downloadMonthlyPDF = (month) =>
  window.open(`${base}/reports/monthly/${month}/pdf?token=${token()}`, '_blank');

// CSV helper
export function downloadCSV(filename, headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
}

// HTML report helper
export function downloadHTML(filename, htmlContent) {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
}
