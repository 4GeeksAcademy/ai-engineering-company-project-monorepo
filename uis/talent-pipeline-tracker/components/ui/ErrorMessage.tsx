import React from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({
  title = 'Ha ocurrido un error',
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 my-4 text-rose-200 shadow-lg backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-rose-500/20 border border-rose-400/30 rounded-xl text-rose-300 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-rose-200">{title}</h4>
          <p className="text-xs text-rose-200/80 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-100 px-3.5 py-2 rounded-xl transition-colors self-end sm:self-center"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reintentar
        </button>
      )}
    </div>
  );
}
