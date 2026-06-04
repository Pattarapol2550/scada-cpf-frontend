import axios from 'axios'

// dev → ใช้ Vite proxy ("/api" → Render) ไม่ต้อง CORS
// prod → ใช้ VITE_API_URL จาก .env
const baseURL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://cpfbackend2-0-39cc.onrender.com')

const api = axios.create({
  baseURL,
  timeout: 20000, // Render free tier spin-up อาจช้า ~15s
})

// Attach token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('scada-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Metrics ──────────────────────────────────────────────

export const getMetrics = (compressorId, params = {}) =>
  api.get(`/api/metrics/${compressorId}`, { params })

export const postMetrics = (payload) =>
  api.post('/api/metrics', payload)

// ── P-H Diagram ──────────────────────────────────────────

export const getPHDiagram = (compressorId, recordId = null) =>
  api.get(`/api/ph-diagram/${compressorId}`, {
    params: recordId ? { record_id: recordId } : {},
  })

export default api