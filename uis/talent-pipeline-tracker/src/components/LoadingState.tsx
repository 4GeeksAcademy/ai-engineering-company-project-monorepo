import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading candidates...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-600 dark:text-slate-300">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-4"></div>
      <p className="text-base font-medium animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingState;
