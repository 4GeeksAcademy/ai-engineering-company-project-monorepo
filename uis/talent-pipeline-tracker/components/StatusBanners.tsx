/** Loading spinner */
export function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}

/** Full-page centered spinner */
export function LoadingPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Spinner />
    </div>
  );
}

/** Inline loading indicator for async operations */
export function LoadingBanner() {
  return (
    <div className="banner banner-info">
      <Spinner /> Loading…
    </div>
  );
}

/** Error banner */
export function ErrorBanner({ message }: { message: string }) {
  return <div className="banner banner-error">{message}</div>;
}

/** Success banner */
export function SuccessBanner({ message }: { message: string }) {
  return <div className="banner banner-success">{message}</div>;
}

/** Empty state */
export function EmptyBanner({ message }: { message?: string }) {
  return (
    <div className="banner banner-empty">
      {message ?? "No candidates found."}
    </div>
  );
}