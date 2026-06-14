'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS = {
  Done: '#10b981',
  'In Progress': '#0ea5e9',
  'To Do': '#94a3b8',
  Pending: '#f59e0b',
  'Change Requested': '#f97316',
};

export default function TeamProgressPieChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((sum, item) => sum + Number(item?.value || 0), 0);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No task progress available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={96}
              paddingAngle={2}
              stroke="none"
              label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
            >
              {safeData.map((entry) => (
                <Cell key={`slice-${entry.name}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [value, name]}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {safeData.map((item) => (
          <div
            key={`legend-${item.name}`}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[item.name] || '#64748b' }}
                />
                {item.name}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
