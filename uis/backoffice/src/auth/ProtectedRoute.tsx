import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { FetchError, Spinner } from "../components/AsyncState";
import { trackMissingToken } from "../telemetry/events";
import { useRequireAuth } from "./useRequireAuth";

/** Layout guard around staff views: missing or invalid JWT → `/login`. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { shouldRedirectToLogin, isLoading, isMissingToken, loginPath, sessionError, retrySession } =
    useRequireAuth();

  useEffect(() => {
    if (!isLoading && isMissingToken) {
      trackMissingToken(window.location.pathname);
    }
  }, [isLoading, isMissingToken]);

  if (isLoading) {
    return (
      <section className="auth-shell">
        <section className="auth-card" aria-busy="true">
          <Spinner label="Checking your session…" />
        </section>
      </section>
    );
  }

  if (sessionError) {
    return (
      <section className="auth-shell">
        <section className="auth-card">
          <p className="auth-card__eyebrow">Brasaland Digital</p>
          <h1>Could not verify session</h1>
          <FetchError
            message={sessionError}
            onRetry={retrySession}
            retryLabel="Retry session check"
            homeTo="/login"
            homeLabel="Back to login"
          />
        </section>
      </section>
    );
  }

  if (shouldRedirectToLogin) {
    return <Navigate to={loginPath} replace />;
  }

  return children;
}
