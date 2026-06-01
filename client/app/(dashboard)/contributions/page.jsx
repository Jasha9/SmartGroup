'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp, Users, AlertCircle } from 'lucide-react';

const weeklyData = [
  { week: 'Wk 1', Alice: 12, Bob: 8, Carol: 10, John: 15 },
  { week: 'Wk 2', Alice: 18, Bob: 12, Carol: 9, John: 14 },
  { week: 'Wk 3', Alice: 14, Bob: 16, Carol: 13, John: 18 },
  { week: 'Wk 4', Alice: 20, Bob: 11, Carol: 15, John: 16 },
];

const members = [
  { name: 'John Smith (You)', avatar: 'JS', tasks: 22, percentage: 87, status: 'excellent', isYou: true },
  { name: 'Alice Chen', avatar: 'AC', tasks: 20, percentage: 82, status: 'good' },
  { name: 'Bob Smith', avatar: 'BS', tasks: 18, percentage: 74, status: 'good' },
  { name: 'Carol Davis', avatar: 'CD', tasks: 17, percentage: 69, status: 'fair' },
];

const healthConfig = {
  excellent: { badge: 'accepted', label: 'Excellent' },
  good: { badge: 'blue', label: 'Good' },
  fair: { badge: 'warning', label: 'Fair' },
};

const topContributor = [...members].sort((a, b) => b.percentage - a.percentage)[0];

export default function ContributionDashboardPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Contribution Dashboard
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Track individual and team contributions over time.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, value: '78%', label: 'Team avg. contribution', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: Users, value: '77', label: 'Total tasks completed', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { icon: AlertCircle, value: '3', label: 'Overdue tasks', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(({ icon: Icon, value, label, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Contributions</CardTitle>
            <CardDescription>Tasks completed per member per week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData} barGap={2} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Alice" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Bob" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Carol" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="John" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top contributor */}
        <Card>
          <CardHeader>
            <CardTitle>Top Contributor</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center py-2">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
                  {topContributor.avatar}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{topContributor.name}</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {topContributor.percentage}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {topContributor.tasks} tasks completed
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Team Health</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full"
                    style={{ width: '78%' }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">78%</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Team is performing well</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual progress */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Progress</CardTitle>
          <CardDescription>Contribution breakdown by team member</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {members.map(({ name, avatar, tasks, percentage, status, isYou }) => (
            <div key={name} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{name}</span>
                    {isYou && <Badge variant="blue">You</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{tasks} tasks</span>
                    <Badge variant={healthConfig[status].badge}>{healthConfig[status].label}</Badge>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  {percentage}%
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
