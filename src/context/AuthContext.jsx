/**
 * context/AuthContext.jsx
 *
 * FIX: ข้าม /me check เมื่ออยู่ที่ /auth/callback
 * เพราะ cookie ยังไม่ถูก set ตอนที่ callback page กำลังประมวลผล
 * ถ้าไม่ข้าม → /me ได้ 401 → setVerified(true) โดยที่ user=null
 * → ProtectedRoute redirect กลับ /login ตัด flow Google ทิ้ง
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { authMe } from '../services/api'

const AuthContext = createContext()

function loadCachedUser() {
  try {
    const raw = sessionStorage.getItem('scada-user')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.username ? { username: u.username, role: u.role || 'user' } : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(loadCachedUser)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    // FIX: ถ้าอยู่ที่ /auth/callback ให้ข้าม /me check
    // GoogleCallbackPage จะเรียก login() เองหลัง backend ตอบกลับ
    if (window.location.pathname === '/auth/callback') {
      setVerified(true)
      return
    }

    authMe()
      .then(res => {
        const { username, role } = res.data
        const safe = { username, role: role || 'user' }
        sessionStorage.setItem('scada-user', JSON.stringify(safe))
        setUser(safe)
      })
      .catch(() => {
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
      isAuth:  !!user,
      isAdmin: user?.role === 'admin',
      verified,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)