/**
 * src/services/api.js — Axios instance + all API calls
 */
import axios from 'axios'

// Dev: empty baseURL → Vite proxy (vite.config.js) forwards /api/* to backend.
// Prod: empty baseURL → Vercel proxy (vercel.json) forwards /api/* to backend.
// Either way, cookies stay same-origin and are never blocked.
const baseURL = ''

const api = axios.create({
  baseURL,
  timeout: 20_000,
  withCredentials: true,
})

api.interceptors.response.use(
  res => res,
  err => {
    const status = err?.response?.status
    const isAuth = err?.config?.url?.includes('/api/auth/')
    if (status === 401 && !isAuth && window.location.pathname !== '/login') {
      // Dispatch event so React Router (ProtectedRoute) handles navigation,
      // preserving beforeunload guards and router history state
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authLogin          = (p) => api.post('/api/auth/login',    p)
export const authLogout         = ()  => api.post('/api/auth/logout')
export const authMe             = ()  => api.get('/api/auth/me')
export const getCompressors     = ()  => api.get('/api/compressors')
export const authGoogleCallback = (p) => api.post('/api/auth/google/callback', p)

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile     = ()  => api.get('/api/auth/profile')
export const updateProfile  = (p) => api.patch('/api/auth/profile', p)
export const changePassword = (p) => api.patch('/api/auth/change-password', p)

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminGetUsers     = ()    => api.get('/api/auth/admin/users')
export const adminCreateUser   = (p)   => api.post('/api/auth/admin/create-user', p)
export const adminToggleActive = (id)  => api.patch(`/api/auth/admin/users/${id}/active`)
export const adminDeleteUser   = (id)  => api.delete(`/api/auth/admin/users/${id}`)

// ── Admin · Compressors ────────────────────────────────────────────────────────
export const adminGetCompressors    = ()     => api.get('/api/auth/admin/compressors')
export const adminCreateCompressor  = (p)    => api.post('/api/auth/admin/compressors', p)
export const adminUpdateCompressor  = (id, p) => api.patch(`/api/auth/admin/compressors/${id}`, p)
export const adminDeleteCompressor  = (id)   => api.delete(`/api/auth/admin/compressors/${id}`)

// ── Metrics ───────────────────────────────────────────────────────────────────
export const getMetrics   = (compressorId, params = {}) =>
  api.get(`/api/metrics/${compressorId}`, { params })
export const postMetrics  = (p) => api.post('/api/metrics', p)
export const bulkImport   = (rows) => api.post('/api/metrics/bulk', rows, { timeout: 120_000 })

// ── P-H Diagram ───────────────────────────────────────────────────────────────
export const getPHDiagram = (comp, params = {}) =>
  api.get(`/api/ph-diagram/${comp}`, { params })

// ── Keep-alive (production only) ──────────────────────────────────────────────
// Ping /health ทุก 9 นาทีเพื่อป้องกัน Render.com free tier sleep (threshold 15 นาที)
if (import.meta.env.PROD) {
  setInterval(() => {
    api.get('/health').catch(() => {})
  }, 9 * 60 * 1000)
}

export default api
