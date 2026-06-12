import { createContext, useContext, useState } from 'react'

// =========================================================
// AuthContext — เก็บ token + minimal user info (username, role)
// ไม่เก็บ password / phone ฝั่ง client
// =========================================================

const AuthContext = createContext()

function loadUser() {
  try {
    const raw = localStorage.getItem('scada-user')
    if (!raw) return null
    const u = JSON.parse(raw)
    if (u && typeof u.username === 'string') {
      return { username: u.username, role: u.role || 'user' }
    }
    return null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem('scada-token') || null
  )
  const [user, setUser] = useState(loadUser)

  const login = (tok, userData) => {
    localStorage.setItem('scada-token', tok)
    const safeUser = {
      username: userData?.username || '',
      role:     userData?.role     || 'user',
    }
    localStorage.setItem('scada-user', JSON.stringify(safeUser))
    setToken(tok)
    setUser(safeUser)
  }

  const logout = () => {
    localStorage.removeItem('scada-token')
    localStorage.removeItem('scada-user')
    setToken(null)
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
