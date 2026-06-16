/**
 * services/api.js — Axios instance + interceptors
 *
 * Security notes:
 *  - withCredentials: true  → sends httpOnly cookie on every request
 *  - 401 interceptor        → auto-redirect to /login (skips auth routes to avoid loops)
 *  - No token stored in JS  → XSS cannot steal credentials
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

// ── 401 → /login ─────────────────────────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    const status  = err?.response?.status
    const isAuth  = err?.config?.url?.includes('/api/auth/')
    if (status === 401 && !isAuth && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authRegister = (payload) => api.post('/api/auth/register', payload)
export const authLogin    = (payload) => api.post('/api/auth/login',    payload)
export const authLogout   = ()        => api.post('/api/auth/logout')
export const authMe       = ()        => api.get('/api/auth/me')

// ── Metrics ───────────────────────────────────────────────────────────────────
export const getMetrics  = (compressorId, params = {}) =>
  api.get(`/api/metrics/${compressorId}`, { params })
export const postMetrics = (payload) => api.post('/api/metrics', payload)

// ── P-H Diagram ───────────────────────────────────────────────────────────────
export const getPHDiagram = (comp, params = {}) =>
  api.get(`/api/ph-diagram/${comp}`, { params })

export default api
