import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Renders the nested routes only for a logged-in user; everyone else goes to /login. */
export default function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <p className="p-10 text-sm text-slate-400">Comprobando la sesión…</p>;
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
