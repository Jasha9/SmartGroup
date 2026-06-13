const variants = {
  default: 'bg-slate-100/90 text-slate-700 border border-slate-200 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-300',
  outline: 'bg-transparent border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300',
  success: 'bg-emerald-100/90 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-100/90 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  destructive: 'bg-red-100/90 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  blue: 'bg-blue-100/90 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  purple: 'bg-indigo-100/90 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  pending: 'bg-amber-100/90 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  accepted: 'bg-emerald-100/90 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  negotiating: 'bg-indigo-100/90 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-[0.01em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
