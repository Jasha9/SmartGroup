const variants = {
  primary:
    'bg-gradient-to-r from-teal-500 to-indigo-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.42)] hover:-translate-y-0.5',
  outline:
    'border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 bg-white/70 dark:bg-slate-900/60 hover:bg-slate-100/90 dark:hover:bg-slate-800',
  ghost:
    'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
  destructive: 'bg-red-500 hover:bg-red-600 text-white shadow-sm hover:-translate-y-0.5',
  teal: 'bg-teal-500 hover:bg-teal-600 text-white shadow-sm hover:-translate-y-0.5',
  indigo: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm hover:-translate-y-0.5',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:-translate-y-0.5',
  success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:-translate-y-0.5',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      className={`sg-button-flow inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
