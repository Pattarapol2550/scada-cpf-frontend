import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

function loadUser() {
  try {
    const raw = localStorage.getItem('scada-user')
    if (!raw) return null
    const u = JSON.parse(raw)
    return (u && typeof u.username === 'string')
      ? { username: u.username, role: u.role || 'user' }
      : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)

  const login = (userData) => {
    // ✅ ไม่เก็บ token — cookie จัดการเอง
    const safeUser = {
      username: userData?.username || '',
      role:     userData?.role     || 'user',
    }
    localStorage.setItem('scada-user', JSON.stringify(safeUser))
    setUser(safeUser)
  }

  const logout = () => {
    localStorage.removeItem('scada-user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuth:  !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)