import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'

import LoginPage      from './pages/LoginPage'
import DashboardPage  from './pages/DashboardPage'
import HistoryPage    from './pages/HistoryPage'
import ManualInputPage from './pages/ManualInputPage'
import PHDiagramPage  from './pages/PHDiagramPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute><HistoryPage /></ProtectedRoute>
            } />
            <Route path="/input" element={
              <ProtectedRoute><ManualInputPage /></ProtectedRoute>
            } />
            <Route path="/ph-diagram" element={
              <ProtectedRoute><PHDiagramPage /></ProtectedRoute>
            } />

            {/* Default → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}