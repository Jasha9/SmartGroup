'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups, getGroupAssessments } from '@/services/groupService';
import { getMyTasks } from '@/services/taskService';
import { getNotifications } from '@/services/notificationService';
import { getCharter } from '@/services/charterService';
import { subscribeDataSync } from '@/lib/dataSync';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import Progress from '@/components/ui/Progress';
import CreateGroupButton from '@/components/workspace/CreateGroupButton';
import { AlertTriangle, CalendarClock, CheckCircle2, Users, Bell, Sparkles, TrendingUp, Clock3 } from 'lucide-react';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_DUE_WINDOW_DAYS = 5;

function formatDate(dateStr) {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'No due date';
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  return fallback;
}

function normalizeStatus(status) {
  return String(status || 'TO_DO').toUpperCase();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [myTasksPayload, setMyTasksPayload] = useState({ grouped: [], tasks: [] });
  const [responsibilities, setResponsibilities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [assessmentsByGroup, setAssessmentsByGroup] = useState({});

  const loadDashboard = async () => {
      try {
        setError(null);

        const [groupsRes, myTasksRes, notificationsRes] = await Promise.all([
          getGroups(),
          getMyTasks(),
          getNotifications(),
        ]);

        const groupList = groupsRes?.data?.groups || groupsRes?.groups || [];
        setGroups(groupList);

        const myTasksData = myTasksRes?.data || myTasksRes || {};
        const groupedTasks = toArray(
          myTasksRes?.grouped ?? myTasksData?.grouped ?? myTasksRes?.data ?? myTasksData,
          []
        );
        const flatTasks = toArray(
          myTasksRes?.tasks ?? myTasksData?.tasks,
          groupedTasks.flatMap((section) => toArray(section?.tasks, []))
        );
        setMyTasksPayload({
          grouped: groupedTasks,
          tasks: flatTasks,
        });

        const notificationList = notificationsRes?.data?.notifications || notificationsRes?.notifications || [];
        setNotifications(notificationList);

        const [charterResults, assessmentResults] = await Promise.all([
          Promise.all(
            groupList.map(async (group) => {
              const groupId = group.group_id || group.id;
              const charterRes = await getCharter(groupId);
              const items = charterRes?.data?.responsibilities || charterRes?.responsibilities || [];
              return items;
            })
          ),
          Promise.all(
            groupList.map(async (group) => {
              const groupId = group.group_id || group.id;
              const assessmentRes = await getGroupAssessments(groupId);
              const assessments = assessmentRes?.data?.assessments || assessmentRes?.assessments || [];
              return { groupId, assessments };
            })
          ),
        ]);

        setResponsibilities(charterResults.flat());

        const groupedAssessments = {};
        assessmentResults.forEach(({ groupId, assessments }) => {
          groupedAssessments[groupId] = assessments;
        });
        setAssessmentsByGroup(groupedAssessments);
      } catch {
        setError('Failed to load dashboard data. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeDataSync(() => {
      loadDashboard();
    });

    const onFocus = () => {
      loadDashboard();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const taskGroups = myTasksPayload.grouped;
  const allTasks = myTasksPayload.tasks;
  const hasGroups = groups.length > 0;
  const firstName = user?.full_name?.split(' ')[0] || 'Student';

  const stats = useMemo(() => {
    const now = Date.now();
    const urgentTasks = allTasks.filter((task) => {
      const status = normalizeStatus(task.status);
      if (status === 'DONE') return false;
      if (!task.due_date) return false;
      const due = new Date(task.due_date).getTime();
      return !Number.isNaN(due) && due >= now && due <= now + DAY_MS * UPCOMING_DUE_WINDOW_DAYS;
    }).length;

    const pendingResponsibilities = responsibilities.filter((row) => {
      const status = String(row.status || '').toUpperCase();
      return status !== 'ACCEPTED' && !row.is_signed;
    }).length;

    const activeGroups = groups.length;
    const activeAssessments = Object.values(assessmentsByGroup).reduce((sum, list) => sum + list.length, 0);

    const upcomingDue = allTasks
      .filter((task) => {
        if (normalizeStatus(task.status) === 'DONE' || !task.due_date) return false;
        const due = new Date(task.due_date).getTime();
        if (Number.isNaN(due)) return false;
        return due >= now && due <= now + DAY_MS * UPCOMING_DUE_WINDOW_DAYS;
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);

    const unreadAlerts = notifications.filter((n) => !n.is_read).length;
    const pendingTasks = allTasks.filter((task) => normalizeStatus(task.status) !== 'DONE').length;

    return {
      urgentTasks,
      pendingResponsibilities,
      activeGroups,
      activeAssessments,
      pendingTasks,
      upcomingDue,
      unreadAlerts,
    };
  }, [allTasks, responsibilities, groups, assessmentsByGroup, notifications]);

  const teamProgressSummary = useMemo(() => {
    if (taskGroups.length === 0) {
      return { done: 0, inProgress: 0, todo: 0, progress: 0 };
    }

    let done = 0;
    let inProgress = 0;
    let todo = 0;

    taskGroups.forEach((section) => {
      section.tasks.forEach((task) => {
        const status = normalizeStatus(task.status);
        if (status === 'DONE') done += 1;
        else if (status === 'IN_PROGRESS') inProgress += 1;
        else todo += 1;
      });
    });

    const total = done + inProgress + todo;
    return {
      done,
      inProgress,
      todo,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [taskGroups]);

  const assessmentInsights = useMemo(() => {
    const groupsByAssessment = new Map();

    for (const task of allTasks) {
      const key = String(task.assessment_id || task.assessment_title || 'unassigned').trim();
      if (!groupsByAssessment.has(key)) {
        groupsByAssessment.set(key, {
          id: key,
          title: task.assessment_title || 'Unassigned Assessment',
          dueDate: task.assessment_due_date || null,
          totalTasks: 0,
          doneTasks: 0,
          inProgressTasks: 0,
          todoTasks: 0,
          totalHours: 0,
          highPriority: 0,
        });
      }

      const row = groupsByAssessment.get(key);
      row.totalTasks += 1;
      row.totalHours += Math.max(1, Number(task.effort_hours || task.estimated_hours || 1));

      const status = normalizeStatus(task.status);
      if (status === 'DONE') row.doneTasks += 1;
      else if (status === 'IN_PROGRESS') row.inProgressTasks += 1;
      else row.todoTasks += 1;

      if (String(task.priority || '').toUpperCase() === 'HIGH') {
        row.highPriority += 1;
      }
    }

    return Array.from(groupsByAssessment.values())
      .sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue;
      })
      .slice(0, 4)
      .map((item) => {
        const completion = item.totalTasks > 0 ? Math.round((item.doneTasks / item.totalTasks) * 100) : 0;
        const statusSummary = completion >= 70 ? 'on track' : item.inProgressTasks > 0 ? 'in progress' : 'at risk';
        return {
          ...item,
          completion,
          statusSummary,
          recommendation: item.highPriority > 0
            ? 'Start high-priority items first and keep daily check-ins.'
            : 'Maintain steady progress and close open tasks early.',
        };
      });
  }, [allTasks]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <p className="sg-eyebrow">Workflow Overview</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {hasGroups ? `Welcome Back, ${firstName} 👋` : `Welcome to SmartGroup, ${firstName} 👋`}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {hasGroups ? 'User → Group → Assessment → Tasks snapshot for today.' : "Let's get your first project started."}
        </p>
        {hasGroups && (
          <div className="flex flex-wrap gap-2 pt-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">Active Groups: {stats.activeGroups}</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">Active Assessments: {stats.activeAssessments}</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">Pending Tasks: {stats.pendingTasks}</span>
          </div>
        )}
        {stats.urgentTasks > 0 && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300 pt-1">
            You have {stats.urgentTasks} tasks requiring attention.
          </p>
        )}
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <CreateGroupButton onGroupCreated={loadDashboard} />
            <Link href="/ai-planner"><Button variant="teal">Create Assessment</Button></Link>
            <Link href="/smartgroup-assistant"><Button variant="outline">Open SmartGroup Assistant</Button></Link>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!hasGroups && (
        <Card>
          <CardHeader>
            <CardTitle>No groups yet.</CardTitle>
            <CardDescription>Create your first group to start planning your next assessment.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGroupButton onGroupCreated={loadDashboard} />
          </CardContent>
        </Card>
      )}

      {hasGroups && (
        <>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="sg-hover-lift">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Upcoming Deadlines</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.urgentTasks}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"><TrendingUp className="w-3 h-3" />Needs attention</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="sg-hover-lift">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending Tasks</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pendingTasks}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><Clock3 className="w-3 h-3" />Open or in progress</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="sg-hover-lift">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active Groups / Assessments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.activeGroups} / {stats.activeAssessments}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><TrendingUp className="w-3 h-3" />Healthy collaboration</p>
              </div>
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="sg-hover-lift">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unread Alerts</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.unreadAlerts}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400"><TrendingUp className="w-3 h-3" />Action required</p>
              </div>
              <Bell className="w-5 h-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team Progress Summary</CardTitle>
            <CardDescription>Task completion across your active assessment sections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-300">Overall completion</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{teamProgressSummary.progress}%</span>
              </div>
              <Progress value={teamProgressSummary.progress} variant="teal" />
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">To Do</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{teamProgressSummary.todo}</p>
              </div>
              <div className="rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{teamProgressSummary.inProgress}</p>
              </div>
              <div className="rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">Done</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{teamProgressSummary.done}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Jump directly into workflow pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/my-tasks" className="block"><Button variant="outline" className="w-full justify-start">My Tasks</Button></Link>
            <Link href="/charter" className="block"><Button variant="outline" className="w-full justify-start">Responsibilities</Button></Link>
            <Link href="/workspace" className="block"><Button variant="outline" className="w-full justify-start">Team Space</Button></Link>
            <Link href="/smartgroup-assistant" className="block"><Button variant="outline" className="w-full justify-start">SmartGroup Assistant</Button></Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" />AI Insights By Assessment</CardTitle>
          <CardDescription>Realtime planning intelligence for each active assessment.</CardDescription>
        </CardHeader>
        <CardContent>
          {assessmentInsights.length === 0 ? (
            <div className="sg-glass p-4 text-sm text-slate-500 dark:text-slate-400">No assessment insights yet. Generate or assign tasks to see AI guidance.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assessmentInsights.map((insight) => (
                <div key={insight.id} className="sg-glass p-4 bg-gradient-to-r from-white/65 to-white/45 dark:from-slate-900/80 dark:to-slate-900/60">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{insight.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due {formatDate(insight.dueDate)}</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{insight.totalTasks} tasks • {insight.totalHours}h estimated • {insight.completion}% complete</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Status: <span className="font-semibold">{insight.statusSummary}</span></p>
                  <p className="mt-2 text-sm font-medium text-teal-700 dark:text-teal-300">Recommendation: {insight.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Due Dates</CardTitle>
          <CardDescription>Nearest task deadlines across all assessments.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.upcomingDue.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming due dates.</p>
          ) : (
            <div className="space-y-2">
              {stats.upcomingDue.map((task) => (
                <div key={task.task_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{task.group_name || 'Group'} · {task.assessment_title || 'Assessment'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-slate-500" />
                    <Badge variant="blue">{formatDate(task.due_date)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>Recent notifications that need attention.</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No alerts yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 6).map((notice) => (
                <div key={notice.notification_id || notice.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100 truncate">{notice.message}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(notice.created_at)}</p>
                  </div>
                  {!notice.is_read && <Badge variant="warning">Unread</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
