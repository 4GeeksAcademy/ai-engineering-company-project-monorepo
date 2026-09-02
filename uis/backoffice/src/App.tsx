import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ProfilePage from './pages/ProfilePage'
import SuppliersPage from './pages/SuppliersPage'
import IncidentsListPage from './pages/IncidentsListPage'
import IncidentFormPage from './pages/IncidentFormPage'
import IncidentsSummaryPage from './pages/IncidentsSummaryPage'
import ProtectedRoute from './pages/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes — require auth */}
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <IncidentsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidents/new"
        element={
          <ProtectedRoute>
            <IncidentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidents/summary"
        element={
          <ProtectedRoute>
            <IncidentsSummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Compatibility redirect from old /profile to /account/profile */}
      <Route
        path="/profile"
        element={<Navigate to="/account/profile" replace />}
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/suppliers" replace />} />
    </Routes>
  )
}
