/**
 * context/AuthContext.jsx
 *
 * Security improvement: localStorage only caches UI display info (username, role).
 * The REAL auth state lives in the httpOnly cookie validated by the server.
 * On mount we call /api/auth/me to verify the session is still valid.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { authMe } from '../services/api'

const AuthContext = createContext()

function loadCachedUser() {
  try {
    const raw = sessionStorage.getItem('scada-user')  // sessionStorage: cleared on tab close
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.username ? { username: u.username, role: u.role || 'user' } : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(loadCachedUser)
  const [verified, setVerified] = useState(false)  // true once /me check completes

  // Verify cookie with backend on every mount / page refresh
  useEffect(() => {
    authMe()
      .then(res => {
        const { username, role } = res.data
        const safe = { username, role: role || 'user' }
        sessionStorage.setItem('scada-user', JSON.stringify(safe))
        setUser(safe)
      })
      .catch(() => {
        // Cookie invalid / expired — clear cached state
        sessionStorage.removeItem('scada-user')
        setUser(null)
      })
      .finally(() => setVerified(true))
  }, [])

  const login = (userData) => {
    const safe = { username: userData?.username || '', role: userData?.role || 'user' }
    sessionStorage.setItem('scada-user', JSON.stringify(safe))
    setUser(safe)
  }

  const logout = () => {
    sessionStorage.removeItem('scada-user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuth:   !!user,
      isAdmin:  user?.role === 'admin',
      verified,         // ProtectedRoute waits for this before redirecting
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
