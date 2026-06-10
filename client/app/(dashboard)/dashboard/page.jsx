'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import Progress from '@/components/ui/Progress';
import { Sparkles, CalendarClock, ShieldCheck, ArrowRight, AlertTriangle, Users, CheckCircle2, BarChart3, Clock3 } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

function greetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function firstName(nameOrEmail) {
  if (!nameOrEmail) return 'Student';
  return nameOrEmail.split(' ')[0] || nameOrEmail.split('@')[0] || 'Student';
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function getDaysToDeadline(tasks) {
  const dueDates = tasks
    .map((t) => t?.due_date)
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (dueDates.length === 0) return 12;
  const diffMs = dueDates[0].getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function getDateKey(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
}

function healthColorForActivity(score) {
  if (score === 0) return 'bg-slate-100 dark:bg-slate-800';
  if (score === 1) return 'bg-teal-100 dark:bg-teal-800/60';
  if (score === 2) return 'bg-teal-200 dark:bg-teal-700/70';
  if (score === 3) return 'bg-teal-300 dark:bg-teal-600/80';
  return 'bg-teal-400 dark:bg-teal-500/90';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    progress: 0,
    activeTasks: 0,
    pendingSignatures: 0,
    unreadNotifications: 0,
    overdueTasks: 0,
  });
  const [memberContributions, setMemberContributions] = useState([]);
  const [groupName, setGroupName] = useState('NIT3004 Capstone Team');
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [groupsRes, notificationsRes] = await Promise.allSettled([
          api.get('/groups'),
          api.get('/notifications'),
        ]);

        let localTasks = [];
        let localContributions = [];

        if (groupsRes.status === 'fulfilled') {
          const groupsData = groupsRes.value.data;
          const groups = groupsData.groups || groupsData || [];
          if (groups.length > 0) {
            const firstGroup = groups[0];
            setGroupName(firstGroup.group_name || firstGroup.name || 'NIT3004 Capstone Team');
            const groupId = firstGroup.group_id || firstGroup.id;

            const [tasksRes, contribRes] = await Promise.allSettled([
              api.get(`/tasks?groupId=${groupId}`),
              api.get(`/contributions/${groupId}`),
            ]);

            if (tasksRes.status === 'fulfilled') {
              const fetchedTasks = asArray(tasksRes.value.data.tasks || tasksRes.value.data);
              localTasks = fetchedTasks;
              setTasks(fetchedTasks);

              const active = fetchedTasks.filter((t) => t.status !== 'DONE').length;
              const done = fetchedTasks.filter((t) => t.status === 'DONE').length;
              const total = fetchedTasks.length;
              const pendingSig = fetchedTasks.filter((t) => !t.is_signed).length;
              const overdue = fetchedTasks.filter((t) => t.status !== 'DONE' && t.due_date && new Date(t.due_date) < new Date()).length;

              setStats((prev) => ({
                ...prev,
                activeTasks: active,
                progress: total > 0 ? Math.round((done / total) * 100) : 0,
                pendingSignatures: pendingSig,
                overdueTasks: overdue,
              }));
            }

            if (contribRes.status === 'fulfilled') {
              localContributions = asArray(contribRes.value.data.contributions || contribRes.value.data);
              setMemberContributions(localContributions);
            }
          }
        }

        if (notificationsRes.status === 'fulfilled') {
          const list = asArray(notificationsRes.value.data.notifications || notificationsRes.value.data);
          setNotifications(list);
          const unread = list.filter((n) => !n.is_read).length;
          setStats((prev) => ({ ...prev, unreadNotifications: unread }));
        }

        if (localTasks.length === 0) setTasks([]);
        if (localContributions.length === 0) setMemberContributions([]);
      } catch {
        // Keep resilient dashboard state.
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const daysRemaining = useMemo(() => getDaysToDeadline(tasks), [tasks]);
  const teamMembersCount = memberContributions.length;
  const upcomingDeadlinesCount = useMemo(
    () => tasks.filter((task) => {
      const due = task?.due_date ? new Date(task.due_date) : null;
      const now = Date.now();
      return (
        task?.status !== 'DONE' &&
        due instanceof Date &&
        !Number.isNaN(due.getTime()) &&
        due.getTime() >= now &&
        due.getTime() <= now + 1000 * 60 * 60 * 24 * 14
      );
    }).length,
    [tasks]
  );

  const participationScore = useMemo(() => {
    if (memberContributions.length === 0) return 65;
    return Math.round(
      memberContributions.reduce((sum, m) => sum + (m.percentage || 0), 0) / memberContributions.length
    );
  }, [memberContributions]);

  const acknowledgementScore = useMemo(() => {
    if (stats.activeTasks === 0) return 100;
    return clamp(100 - Math.round((stats.pendingSignatures / stats.activeTasks) * 100));
  }, [stats.activeTasks, stats.pendingSignatures]);

  const overdueHealth = useMemo(() => Math.max(0, 100 - stats.overdueTasks * 20), [stats.overdueTasks]);

  const healthScore = useMemo(() => {
    const pendingRatio = stats.activeTasks > 0 ? stats.pendingSignatures / stats.activeTasks : 0;
    const completion = stats.progress;
    const overduePenalty = stats.overdueTasks * 7;

    const score = completion * 0.45 + participationScore * 0.35 + (100 - pendingRatio * 100) * 0.2 - overduePenalty;
    return clamp(Math.round(score));
  }, [stats, participationScore]);

  const healthLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Stable' : 'At Risk';

  const healthMetrics = useMemo(
    () => [
      {
        label: 'Completion',
        value: stats.progress,
        detail: `${stats.progress}% complete`,
        Icon: CheckCircle2,
      },
      {
        label: 'Participation',
        value: participationScore,
        detail: `${participationScore}% team average`,
        Icon: Users,
      },
      {
        label: 'Acknowledgements',
        value: acknowledgementScore,
        detail: `${stats.pendingSignatures} pending`,
        Icon: CheckCircle2,
      },
      {
        label: 'Overdue Tasks',
        value: overdueHealth,
        detail: `${stats.overdueTasks} overdue`,
        Icon: Clock3,
      },
    ],
    [stats.progress, participationScore, acknowledgementScore, overdueHealth, stats.pendingSignatures, stats.overdueTasks]
  );

  const heatmapData = useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const map = {};
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - index);
      map[getDateKey(date)] = { date, count: 0 };
    }

    const addActivity = (dateString, weight = 1) => {
      if (!dateString) return;
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return;
      const key = getDateKey(date);
      if (map[key]) {
        map[key].count += weight;
      }
    };

    tasks.forEach((task) => {
      const eventDate = task.updated_at || task.created_at;
      addActivity(eventDate, 1);
      if (task.status === 'DONE') addActivity(eventDate, 2);
      if (task.is_signed) addActivity(eventDate, 1);
    });

    notifications.forEach((notification) => {
      addActivity(notification.created_at, 1);
    });

    return Object.values(map);
  }, [tasks, notifications]);

  const scoreboard = useMemo(() => {
    return [...memberContributions]
      .map((m) => ({
        name: m.full_name || m.name || m.email || 'Member',
        score: m.percentage || 0,
        completed: m.completed || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [memberContributions]);

  const recommendations = useMemo(() => {
    const tips = [];
    if (stats.pendingSignatures > 0) {
      tips.push(`${stats.pendingSignatures} responsibilities still need acknowledgement.`);
    }
    if (stats.overdueTasks > 0) {
      tips.push(`${stats.overdueTasks} tasks are overdue. Prioritise a recovery check-in.`);
    }
    if (stats.activeTasks >= 3) {
      tips.push(`${stats.activeTasks} active tasks are in-flight. Schedule a short review this week.`);
    }
    if (scoreboard[0] && scoreboard[scoreboard.length - 1]) {
      tips.push(`Workload gap detected between ${scoreboard[0].name} and ${scoreboard[scoreboard.length - 1].name}. Consider rebalancing.`);
    }
    if (tips.length === 0) {
      tips.push('Team momentum is healthy. Keep progress updates flowing in the workspace.');
    }
    return tips.slice(0, 4);
  }, [stats, scoreboard]);

  const pendingActions = useMemo(() => {
    const cards = [];

    if (stats.pendingSignatures > 0) {
      cards.push({
        title: 'Accept Responsibility',
        detail: `${stats.pendingSignatures} task acknowledgements pending`,
        variant: 'warning',
      });
    }

    if (stats.overdueTasks > 0) {
      cards.push({
        title: 'Update Progress',
        detail: `${stats.overdueTasks} tasks need status updates`,
        variant: 'destructive',
      });
    }

    asArray(notifications)
      .filter((n) => !n.is_read)
      .slice(0, 2)
      .forEach((n) => {
        cards.push({
          title: n.type === 'TASK_ASSIGNED' ? 'Review Assignment' : 'Review Team Alert',
          detail: n.message,
          variant: 'blue',
        });
      });

    return cards.slice(0, 4);
  }, [stats, notifications]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <LoadingState message="SmartGroup Assistant is preparing your team overview..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid gap-6 xl:grid-cols-[1.8fr_1.2fr]">
        <Card className="overflow-hidden border-slate-200/70 dark:border-slate-800">
          <CardContent className="py-6 px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="sg-eyebrow">AI Project Coordinator</p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
                  {greetingByTime()}, {firstName(user?.full_name || user?.email)}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                  SmartGroup keeps your team accountable and on track for academic success.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Capstone Deadline</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{daysRemaining} days</p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Group</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{groupName}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">My Tasks</p>
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.activeTasks}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Open assignments currently in progress.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Team Members</p>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">{teamMembersCount || '—'}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Active contributors in your current group.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Team Health</p>
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">{healthScore}%</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{healthLabel} status with current task flow.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Upcoming Deadlines</p>
                  <Clock3 className="w-4 h-4 text-amber-500" />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">{upcomingDeadlinesCount}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Due in the next two weeks.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle>Action Required</CardTitle>
            <CardDescription>Pending tasks, acknowledgements, and unread updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Acknowledgements</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.pendingSignatures}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Overdue Tasks</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.overdueTasks}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unread Alerts</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.unreadNotifications}</p>
              </div>
            </div>

            {pendingActions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/70 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">All clear</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Your dashboard has no urgent tasks or acknowledgements waiting.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((action, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{action.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{action.detail}</p>
                      </div>
                      <Badge variant={action.variant}>{action.variant === 'warning' ? 'Action Needed' : 'Pending'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => router.push('/action-center')}>
              <AlertTriangle className="w-4 h-4" />
              Review Action Center
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Team Health
            </CardTitle>
            <CardDescription>Visual indicators that help you spot momentum and challenges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Health score</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{healthScore}%</p>
              </div>
              <Badge variant={healthScore >= 85 ? 'accepted' : healthScore >= 70 ? 'blue' : 'warning'}>{healthLabel}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {healthMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{metric.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{metric.detail}</p>
                    </div>
                    <metric.Icon className="w-4 h-4 text-slate-400" />
                  </div>
                  <Progress value={metric.value} className="mt-4" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
              <p>Active tasks: {stats.activeTasks}</p>
              <p>Pending acknowledgements: {stats.pendingSignatures}</p>
              <p>Completion rate: {stats.progress}%</p>
              <p>Upcoming deadlines: {upcomingDeadlinesCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              SmartGroup Assistant
            </CardTitle>
            <CardDescription>Concise recommendations to keep your team moving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length ? (
              recommendations.map((tip, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{tip}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                <p className="text-sm text-slate-600 dark:text-slate-300">No recommendations yet. Once your team has activity, SmartGroup will surface the next steps here.</p>
              </div>
            )}
            <Button variant="teal" className="w-full mt-2 justify-between" onClick={() => router.push('/smartgroup-assistant')}>
              Open SmartGroup Assistant
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Engagement Heatmap</CardTitle>
          <CardDescription>Participation over the last 30 days from task updates, acknowledgements, and completed work.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Subtle intensity makes it easy to spot the days when your group was most active.
          </div>
          <div className="grid grid-cols-7 gap-1">
            {heatmapData.map((day) => {
              const level = Math.min(day.count, 4);
              return (
                <div
                  key={day.date.toISOString()}
                  title={`${day.date.toLocaleDateString()} — ${day.count} activity${day.count === 1 ? '' : 's'}`}
                  className={`h-9 rounded-sm border border-slate-200/70 dark:border-slate-800 ${healthColorForActivity(level)}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Less</span>
            <div className="grid flex-1 grid-cols-5 gap-1">
              <div className="h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 rounded-sm bg-teal-100 dark:bg-teal-800/60" />
              <div className="h-3 rounded-sm bg-teal-200 dark:bg-teal-700/70" />
              <div className="h-3 rounded-sm bg-teal-300 dark:bg-teal-600/80" />
              <div className="h-3 rounded-sm bg-teal-400 dark:bg-teal-500/90" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accountability Scoreboard</CardTitle>
          <CardDescription>Contribution ranking by ownership follow-through.</CardDescription>
        </CardHeader>
        <CardContent>
          {scoreboard.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-slate-50/80 dark:bg-slate-900/50 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              <p className="text-sm text-slate-600 dark:text-slate-300">SmartGroup Assistant is ready to build your first accountability baseline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scoreboard.map((member, idx) => (
                <div key={member.name} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{member.name}</p>
                    <Badge variant={idx === 0 ? 'accepted' : 'default'}>Rank #{idx + 1}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 mt-2">{member.score}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{member.completed} completed tasks</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
