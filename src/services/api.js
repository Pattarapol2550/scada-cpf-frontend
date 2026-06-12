import axios from 'axios'

// dev → ใช้ Vite proxy ("/api" → Render)
// prod → ใช้ VITE_API_URL จาก .env
const baseURL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://cpfbackend2-0.onrender.com')

const api = axios.create({ baseURL, timeout: 20000 })

// ── Attach JWT token to every request ──────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('scada-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── ถ้าได้ 401 → เคลียร์ session + เด้ง login ──────────
api.interceptors.response.use(
  res => res,
  err => {
    const status  = err?.response?.status
    const isAuth  = err?.config?.url?.includes('/api/auth/')
    if (status === 401 && !isAuth) {
      localStorage.removeItem('scada-token')
      localStorage.removeItem('scada-user')
      if (window.location.pathname !== '/login')
        window.location.assign('/login')
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────
export const authRegister = (payload) => api.post('/api/auth/register', payload)
// payload: { username, email, password, phone }

export const authLogin = (payload) => api.post('/api/auth/login', payload)
// payload: { identifier, password }
// response: { access_token, user: { username, role } }

export const authMe = () => api.get('/api/auth/me')

// ── Metrics ────────────────────────────────────────────
export const getMetrics  = (compressorId, params = {}) =>
  api.get(`/api/metrics/${compressorId}`, { params })

export const postMetrics = (payload) => api.post('/api/metrics', payload)

// ── P-H Diagram ────────────────────────────────────────
export const getPHDiagram = (comp, params = {}) =>
  api.get(`/api/ph-diagram/${comp}`, { params })

export default api
