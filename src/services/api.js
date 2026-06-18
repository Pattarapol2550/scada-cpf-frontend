/**
 * src/services/api.js — Axios instance + all API calls
 */
import axios from 'axios'

const baseURL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://cpfbackend2-0.onrender.com')

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
      window.location.assign('/login')
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authLogin          = (p) => api.post('/api/auth/login',    p)
export const authLogout         = ()  => api.post('/api/auth/logout')
export const authMe             = ()  => api.get('/api/auth/me')
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

// ── Metrics ───────────────────────────────────────────────────────────────────
export const getMetrics  = (compressorId, params = {}) =>
  api.get(`/api/metrics/${compressorId}`, { params })
export const postMetrics = (p) => api.post('/api/metrics', p)

// ── P-H Diagram ───────────────────────────────────────────────────────────────
export const getPHDiagram = (comp, params = {}) =>
  api.get(`/api/ph-diagram/${comp}`, { params })

export default api