/**
 * components/layout/ProtectedRoute.jsx
 *
 * Waits for the /api/auth/me check before deciding to redirect.
 * Prevents a "flash to /login" on hard-refresh when the session is still valid.
 */
import { Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuth, verified } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleExpired = () => navigate('/login', { replace: true })
    window.addEventListener('auth:session-expired', handleExpired)
    return () => window.removeEventListener('auth:session-expired', handleExpired)
  }, [navigate])

  // Still waiting for server verification — render nothing (or a spinner)
  if (!verified) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg0)', color: 'var(--text-3)', fontSize: 13,
      }}>
        กำลังตรวจสอบสิทธิ์…
      </div>
    )
  }

  return isAuth ? children : <Navigate to="/login" replace />
}
