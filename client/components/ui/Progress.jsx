export default function Progress({ value = 0, max = 100, label, showPercent = true, className = '' }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`space-y-1 ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
          )}
          {showPercent && (
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
