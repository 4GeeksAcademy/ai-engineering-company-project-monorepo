import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import IncidentsAnalysisPage from "./pages/IncidentsAnalysisPage";
import LoginPage from "./pages/LoginPage";
import SuppliersPage from "./pages/SuppliersPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/incidents" element={<IncidentsAnalysisPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
