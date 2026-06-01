import React from 'react';

export default function LoadingState({ message = 'Loading...', className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 p-4 animate-pulse bg-white/80 dark:bg-slate-900/80 ${className}`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
