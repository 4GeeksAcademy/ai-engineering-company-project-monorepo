'use client'; // Error boundaries must be Client Components

import ErrorState from '../components/ErrorState';

// A rendering error shows this instead of a blank page. The error's own text is never shown.
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-10">
      <ErrorState
        title="Algo ha salido mal"
        message="No hemos podido mostrar esta página. Inténtalo de nuevo."
        onRetry={() => retry()}
      />
    </div>
  );
}
