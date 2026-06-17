// ── App.jsx ───────────────────────────────────────────────────────────────────
// เพิ่ม route /auth/callback สำหรับรับ Google redirect

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider }  from './context/AuthContext'
import ProtectedRoute    from './components/layout/ProtectedRoute'

import LoginPage           from './pages/LoginPage'
import GoogleCallbackPage  from './pages/GoogleCallbackPage'   // ← ใหม่
import DashboardPage       from './pages/DashboardPage'
import HistoryPage         from './pages/HistoryPage'
import ManualInputPage     from './pages/ManualInputPage'
import PHDiagramPage       from './pages/PHDiagramPage'
import CalculatorPage      from './pages/CalculatorPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public */}
            <Route path="/login"         element={<LoginPage />} />
            {/* Google OAuth callback — รับ ?code=xxx จาก Google */}
            <Route path="/auth/callback" element={<GoogleCallbackPage />} />

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
            <Route path="/calculator" element={
              <ProtectedRoute><CalculatorPage /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}