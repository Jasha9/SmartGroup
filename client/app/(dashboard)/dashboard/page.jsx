'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import Progress from '@/components/ui/Progress';
import { Sparkles, CalendarClock, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';
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

  const healthScore = useMemo(() => {
    const pendingRatio = stats.activeTasks > 0 ? stats.pendingSignatures / stats.activeTasks : 0;
    const completion = stats.progress;
    const participation = memberContributions.length > 0
      ? Math.round(memberContributions.reduce((sum, m) => sum + (m.percentage || 0), 0) / memberContributions.length)
      : 70;
    const overduePenalty = stats.overdueTasks * 7;

    const score = completion * 0.45 + participation * 0.35 + (100 - pendingRatio * 100) * 0.2 - overduePenalty;
    return clamp(Math.round(score));
  }, [stats, memberContributions]);

  const healthLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Stable' : 'At Risk';

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
      <Card className="overflow-hidden border-slate-200/70 dark:border-slate-800">
        <CardContent className="py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="sg-eyebrow">AI Project Coordinator</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {greetingByTime()}, {firstName(user?.full_name || user?.email)}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                SmartGroup keeps your team accountable and on track for academic success.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/70">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Capstone Deadline</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{daysRemaining} Days Remaining</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/70">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Current Group</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{groupName}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Group Health Score
            </CardTitle>
            <CardDescription>Based on completion, participation, acknowledgements, and pending workload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={healthScore >= 85 ? 'accepted' : healthScore >= 70 ? 'blue' : 'warning'}>{healthLabel}</Badge>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{healthScore}%</span>
            </div>
            <Progress value={healthScore} label="Team Health" />
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <p>Pending tasks: {stats.activeTasks}</p>
              <p>Pending acknowledgements: {stats.pendingSignatures}</p>
              <p>Completion rate: {stats.progress}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Accountability Scoreboard</CardTitle>
            <CardDescription>Contribution ranking by ownership follow-through.</CardDescription>
          </CardHeader>
          <CardContent>
            {scoreboard.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">SmartGroup Assistant is ready to build your first accountability baseline.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scoreboard.map((member, idx) => (
                  <div key={member.name} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-800/40">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              SmartGroup Assistant
            </CardTitle>
            <CardDescription>AI guidance for this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((tip, index) => (
              <div key={index} className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
                <p className="text-sm text-slate-700 dark:text-slate-300">{tip}</p>
              </div>
            ))}
            <Button variant="teal" className="w-full mt-2 justify-between" onClick={() => router.push('/smartgroup-assistant')}>
              Open SmartGroup Assistant
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              Pending Actions
            </CardTitle>
            <CardDescription>What requires your attention now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingActions.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                <p className="text-sm text-slate-600 dark:text-slate-300">No actions require your attention right now.</p>
              </div>
            ) : (
              pendingActions.map((action, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{action.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{action.detail}</p>
                    </div>
                    <Badge variant={action.variant}>{action.variant === 'warning' ? 'Action Needed' : 'Pending'}</Badge>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" className="w-full" onClick={() => router.push('/action-center')}>
              <AlertTriangle className="w-4 h-4" />
              Review Action Center
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
