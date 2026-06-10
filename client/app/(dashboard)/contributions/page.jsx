'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups } from '@/services/groupService';
import { getContributions } from '@/services/contributionService';
import { getTasks } from '@/services/taskService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trophy, TrendingUp, Scale, ShieldCheck } from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getHealth(pct) {
  if (pct >= 80) return 'excellent';
  if (pct >= 60) return 'good';
  return 'fair';
}

export default function ContributionDashboardPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
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

        const [contribData, taskData] = await Promise.all([
          getContributions(groupId),
          getTasks(groupId),
        ]);

        const d = contribData?.data || {};
        setMembers(d.contributions || []);
        setSummary(d.summary || { teamAvg: 0, totalCompleted: 0, totalOverdue: 0 });
        setTasks(taskData?.data?.tasks || taskData?.tasks || []);
      } catch {
        setError('Failed to load team insights. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const topContributor = useMemo(() => {
    if (members.length === 0) return null;
    return [...members].sort((a, b) => b.percentage - a.percentage)[0];
  }, [members]);

  const workloadData = useMemo(() => {
    return members.map((m) => {
      const assigned = tasks.filter((t) => t.assigned_to_email === m.email || t.assigned_to_name === m.full_name);
      return {
        name: m.full_name ? m.full_name.split(' ')[0] : m.email?.split('@')[0] || 'Member',
        inProgress: assigned.filter((t) => t.status === 'IN_PROGRESS').length,
        todo: assigned.filter((t) => t.status === 'TO_DO').length,
        done: assigned.filter((t) => t.status === 'DONE').length,
      };
    });
  }, [members, tasks]);

  const trendData = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const active = tasks.filter((t) => t.status !== 'DONE').length;
    const overdue = tasks.filter((t) => t.status !== 'DONE' && t.due_date && new Date(t.due_date) < new Date()).length;

    return [
      { label: 'Current', completion: done, active, overdue },
      { label: 'Forecast', completion: done + Math.max(1, Math.round(active * 0.4)), active: Math.max(0, active - Math.round(active * 0.4)), overdue: Math.max(0, overdue - 1) },
    ];
  }, [tasks]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading team insights..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="sg-eyebrow">Accountability Intelligence</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">Team Progress</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Accountability scores, workload balance, and team health analytics.
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
            <p className="text-lg font-medium">Complete tasks to unlock team insights.</p>
          </div>
        </Card>
      )}

      {members.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                    <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.teamAvg}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Team Health Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                    <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.totalCompleted}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Task Completion Volume</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <Scale className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.totalOverdue}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Workload Risk Alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Contribution Distribution</CardTitle>
                <CardDescription>Completed tasks by team member.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={members.map((m) => ({
                      name: m.full_name ? m.full_name.split(' ')[0] : m.email?.split('@')[0] || 'Member',
                      completed: m.completed,
                    }))}
                    barSize={30}
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
                    <Bar dataKey="completed" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Accountability</CardTitle>
                <CardDescription>Highest accountability score</CardDescription>
              </CardHeader>
              <CardContent>
                {topContributor && (
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                        {getInitials(topContributor.full_name || topContributor.email)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                        <Trophy className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {topContributor.full_name || topContributor.email}
                      {user && (topContributor.user_id === user.user_id || topContributor.email === user.email) ? ' (You)' : ''}
                    </p>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300 mt-1">{topContributor.percentage}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{topContributor.completed} tasks completed</p>
                    <div className="mt-3">
                      <Badge variant={getHealth(topContributor.percentage) === 'excellent' ? 'accepted' : getHealth(topContributor.percentage) === 'good' ? 'blue' : 'warning'}>
                        {getHealth(topContributor.percentage).toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Completion Trends</CardTitle>
                <CardDescription>Current vs short-term forecast.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="completion" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="active" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="overdue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workload Balance</CardTitle>
                <CardDescription>TO_DO, IN_PROGRESS, DONE split per member.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workloadData.map((row) => (
                  <div key={row.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">{row.todo + row.inProgress + row.done} total</span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
                      <div className="bg-slate-400" style={{ width: `${(row.todo / Math.max(row.todo + row.inProgress + row.done, 1)) * 100}%` }} />
                      <div className="bg-teal-500" style={{ width: `${(row.inProgress / Math.max(row.todo + row.inProgress + row.done, 1)) * 100}%` }} />
                      <div className="bg-emerald-500" style={{ width: `${(row.done / Math.max(row.todo + row.inProgress + row.done, 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
