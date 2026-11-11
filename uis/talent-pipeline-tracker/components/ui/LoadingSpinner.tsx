import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({
  message = 'Cargando información...',
  size = 'md',
}: LoadingSpinnerProps) {
  const spinnerSize = size === 'sm' ? 'w-5 h-5 border-2' : size === 'lg' ? 'w-12 h-12 border-4' : 'w-8 h-8 border-3';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-emerald-100/60 my-4">
      <div
        className={`${spinnerSize} border-emerald-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.25)]`}
        role="status"
        aria-label="cargando"
      />
      {message && <p className="mt-3 text-sm font-medium text-emerald-100/70">{message}</p>}
    </div>
  );
}
