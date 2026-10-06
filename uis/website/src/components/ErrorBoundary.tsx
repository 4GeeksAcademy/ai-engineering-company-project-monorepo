import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Public site: render failures stay on-brand and never expose a stack trace. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    console.error("Website render error");
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <p>Brasaland</p>
          <h1>This page could not be shown</h1>
          <p>
            Reload to try again, or return to the homepage. If this continues,
            contact Brasaland Digital at Medellín headquarters.
          </p>
          <p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </p>
          <p>
            <a href="/">Back to homepage</a>
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}
