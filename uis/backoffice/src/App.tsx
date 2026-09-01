import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import SuppliersPage from './pages/SuppliersPage'
import ProtectedRoute from './pages/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
        path="/account/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
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
