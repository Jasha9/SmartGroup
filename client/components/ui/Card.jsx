export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`sg-flow-in sg-glow-hover rounded-[24px] border border-white/70 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_40px_rgba(2,6,23,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_45px_rgba(15,23,42,0.12)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-5 border-b border-slate-200/80 dark:border-slate-800/80 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-base font-bold text-slate-900 dark:text-slate-100 ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div
      className={`px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center ${className}`}
    >
      {children}
    </div>
  );
}
