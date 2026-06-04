import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem('scada-token') || null
  )
  const [user, setUser] = useState(null)

  const login = (tok, userData) => {
    localStorage.setItem('scada-token', tok)
    setToken(tok)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('scada-token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
