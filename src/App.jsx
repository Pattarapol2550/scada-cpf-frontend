import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider }  from './context/AuthContext'
import ProtectedRoute    from './components/layout/ProtectedRoute'

import LoginPage          from './pages/LoginPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import OverviewPage       from './pages/OverviewPage'
import DashboardPage      from './pages/DashboardPage'
import HistoryPage        from './pages/HistoryPage'
import ManualInputPage    from './pages/ManualInputPage'
import PHDiagramPage      from './pages/PHDiagramPage'
import CalculatorPage     from './pages/CalculatorPage'
import SettingsPage       from './pages/SettingsPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<GoogleCallbackPage />} />

            <Route path="/overview"   element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
            <Route path="/dashboard"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/history"    element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/input"      element={<ProtectedRoute><ManualInputPage /></ProtectedRoute>} />
            <Route path="/ph-diagram" element={<ProtectedRoute><PHDiagramPage /></ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
            <Route path="/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}