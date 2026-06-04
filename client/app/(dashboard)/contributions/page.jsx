'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups } from '@/services/groupService';
import { getContributions } from '@/services/contributionService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp, Users, AlertCircle } from 'lucide-react';

const STATUS_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777', '#0891b2'];

const healthConfig = {
  excellent: { badge: 'accepted', label: 'Excellent' },
  good: { badge: 'blue', label: 'Good' },
  fair: { badge: 'warning', label: 'Fair' },
};

function getHealth(pct) {
  if (pct >= 80) return 'excellent';
  if (pct >= 60) return 'good';
  return 'fair';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ContributionDashboardPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState({ teamAvg: 0, totalCompleted: 0, totalOverdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const groupsData = await getGroups();
        const groups = groupsData?.data?.groups || groupsData?.groups || [];
        if (groups.length === 0) {
          setLoading(false);
          return;
        }
        const groupId = groups[0].group_id || groups[0].id;
        const contribData = await getContributions(groupId);
        const d = contribData?.data || {};
        setMembers(d.contributions || []);
        setSummary(d.summary || { teamAvg: 0, totalCompleted: 0, totalOverdue: 0 });
      } catch {
        setError('Failed to load contribution data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading contribution dashboard..." />
      </div>
    );
  }

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

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!error && members.length === 0 && (
        <Card>
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No contribution data yet</p>
            <p className="text-sm mt-1">Complete tasks to generate contribution analytics.</p>
          </div>
        </Card>
      )}

      {members.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, value: `${summary.teamAvg}%`, label: 'Team avg. contribution', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { icon: Users, value: String(summary.totalCompleted), label: 'Total tasks completed', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
              { icon: AlertCircle, value: String(summary.totalOverdue), label: 'Overdue tasks', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
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
                <CardTitle>Member Contributions</CardTitle>
                <CardDescription>Tasks completed per member</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={members.map((m) => ({
                      name: m.full_name ? m.full_name.split(' ')[0] : m.email?.split('@')[0] || 'Member',
                      completed: m.completed,
                    }))}
                    barGap={2}
                    barSize={28}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="completed" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top contributor */}
            {(() => {
              const top = [...members].sort((a, b) => b.percentage - a.percentage)[0];
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Contributor</CardTitle>
                    <CardDescription>By completion rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center text-center py-2">
                      <div className="relative mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
                          {getInitials(top.full_name)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                          <Trophy className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {top.full_name || top.email}
                        {user && (top.user_id === user.user_id || top.email === user.email) ? ' (You)' : ''}
                      </p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {top.percentage}%
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {top.completed} tasks completed
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Team Health</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full"
                            style={{ width: `${summary.teamAvg}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{summary.teamAvg}%</span>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        {summary.teamAvg >= 70 ? 'Team is performing well' : 'Needs improvement'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Individual progress */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Progress</CardTitle>
              <CardDescription>Contribution breakdown by team member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {members.map((m, idx) => {
                const isYou = user && (m.user_id === user.user_id || m.email === user.email);
                const health = getHealth(m.percentage);
                return (
                  <div key={m.user_id || idx} className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${STATUS_COLORS[idx % STATUS_COLORS.length]}, ${STATUS_COLORS[(idx + 1) % STATUS_COLORS.length]})` }}
                    >
                      {getInitials(m.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {m.full_name || m.email}
                          </span>
                          {isYou && <Badge variant="blue">You</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{m.completed} tasks</span>
                          <Badge variant={healthConfig[health].badge}>{healthConfig[health].label}</Badge>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full"
                          style={{ width: `${m.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                        {m.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

