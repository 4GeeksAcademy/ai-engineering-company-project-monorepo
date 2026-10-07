import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SUPPORT_PROMPT } from "../lib/api";

export function Spinner({ label }: { label: string }) {
  return (
    <div className="async-state" role="status" aria-live="polite" aria-busy="true">
      <span className="async-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonLines({ rows = 4 }: { rows?: number }) {
  return (
    <div className="async-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="async-skeleton__line" />
      ))}
    </div>
  );
}

export function FetchError({
  message,
  onRetry,
  retryLabel = "Try again",
  homeTo = "/accessible",
  homeLabel = "Operations home",
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  homeTo?: string;
  homeLabel?: string;
}) {
  return (
    <div className="async-state async-state--error" role="alert">
      <p>{message}</p>
      <div className="async-state__actions">
        <button type="button" className="async-state__retry" onClick={onRetry}>
          {retryLabel}
        </button>
        <Link className="async-state__home" to={homeTo}>
          {homeLabel}
        </Link>
      </div>
      <p className="async-state__support">{SUPPORT_PROMPT}</p>
    </div>
  );
}

export function AsyncPanel({
  status,
  loadingLabel,
  error,
  onRetry,
  children,
  skeletonRows = 4,
}: {
  status: "loading" | "success" | "error";
  loadingLabel: string;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
  skeletonRows?: number;
}) {
  if (status === "loading") {
    return (
      <>
        <Spinner label={loadingLabel} />
        <SkeletonLines rows={skeletonRows} />
      </>
    );
  }
  if (status === "error") {
    return (
      <FetchError
        message={error || "This section could not be loaded."}
        onRetry={onRetry}
      />
    );
  }
  return children;
}
