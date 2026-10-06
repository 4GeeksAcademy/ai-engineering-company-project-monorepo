import { Component, type ReactNode } from "react";
import { trackClientException } from "../telemetry/events";
import "../pages/AuthPages.css";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Catches render crashes so staff still see a recovery path instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error("Backoffice render error");
    trackClientException("error_boundary", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="auth-shell">
          <section className="auth-card" role="alert">
            <p className="auth-card__eyebrow">Brasaland Digital</p>
            <h1>This view failed to load</h1>
            <p className="auth-card__lead">
              The staff console hit an unexpected problem. Reload, or return to
              operations home. If this continues, contact Brasaland Digital at
              Medellín headquarters.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
            <p className="auth-card__muted">
              <a href="/accessible">Operations home</a>
            </p>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
