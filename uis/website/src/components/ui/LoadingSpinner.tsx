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
    <div className="flex flex-col items-center justify-center p-8 text-slate-500 my-4">
      <div
        className={`${spinnerSize} border-blue-600 border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label="cargando"
      />
      {message && <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>}
    </div>
  );
}
