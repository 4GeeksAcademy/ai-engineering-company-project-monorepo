import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import IncidentsAnalysisPage from "./pages/IncidentsAnalysisPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import SuppliersPage from "./pages/SuppliersPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public: the only views reachable without a session. */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Everything else needs a session (RequireAuth reads the token from localStorage). */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/incidents" element={<IncidentsAnalysisPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/account/profile" element={<ProfilePage />} />
            </Route>
            {/* Unknown URLs go through the guard too, then to the home page. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
