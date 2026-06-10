'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyTasks } from '@/services/taskService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import Progress from '@/components/ui/Progress';
import { CheckCircle2, Clock3, CircleDotDashed, MessageSquareWarning, CircleDashed } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function statusIcon(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'DONE') return <CheckCircle2 className="w-4 h-4" />;
  if (normalized === 'IN_PROGRESS') return <CircleDotDashed className="w-4 h-4" />;
  if (normalized === 'NEGOTIATING' || normalized === 'CHANGE_REQUESTED') return <MessageSquareWarning className="w-4 h-4" />;
  return <CircleDashed className="w-4 h-4" />;
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyTasks();
        const list = data?.data?.tasks || data?.tasks || [];
        setTasks(list);
      } catch {
        setError('Failed to load your tasks. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const taskProgressValue = (task) => {
    const normalized = String(task.status || '').toUpperCase();
    if (normalized === 'DONE') return 100;
    if (normalized === 'IN_PROGRESS') return 55;
    if (normalized === 'PENDING_ACCEPTANCE') return 15;
    if (normalized === 'NEGOTIATING' || normalized === 'CHANGE_REQUESTED') return 25;
    return 10;
  };

  const priorityConfig = (priority) => {
    const normalized = String(priority || 'MEDIUM').toUpperCase();
    if (normalized === 'HIGH') return { label: 'High', variant: 'destructive' };
    if (normalized === 'LOW') return { label: 'Low', variant: 'default' };
    return { label: 'Medium', variant: 'warning' };
  };

  const accountabilityBadge = (task) => {
    const normalized = String(task.status || '').toUpperCase();
    if (normalized === 'DONE') return { label: 'Completed', variant: 'accepted' };
    if (task.due_date && new Date(task.due_date) < new Date() && normalized !== 'DONE') {
      return { label: 'Overdue', variant: 'destructive' };
    }
    if (task.is_signed) return { label: 'Accepted', variant: 'accepted' };
    if (normalized === 'PENDING_ACCEPTANCE') return { label: 'Pending Acknowledgement', variant: 'warning' };
    return { label: 'Awaiting Approval', variant: 'default' };
  };

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const taskSummary = useMemo(() => {
    const pending = tasks.filter((task) => String(task.status || '').toUpperCase() === 'PENDING_ACCEPTANCE').length;
    const completed = tasks.filter((task) => String(task.status || '').toUpperCase() === 'DONE').length;
    const overdue = tasks.filter((task) => {
      const due = task.due_date ? new Date(task.due_date) : null;
      return task.status !== 'DONE' && due instanceof Date && !Number.isNaN(due.getTime()) && due < today;
    }).length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const highPriority = tasks.filter((task) => String(task.priority || '').toUpperCase() === 'HIGH' && String(task.status || '').toUpperCase() !== 'DONE');
    const dueSoon = tasks.filter((task) => {
      const due = task.due_date ? new Date(task.due_date) : null;
      return task.status !== 'DONE' && due instanceof Date && !Number.isNaN(due.getTime()) && due >= today && due <= new Date(today.getTime() + 1000 * 60 * 60 * 24 * 3);
    }).length;

    return { pending, completed, overdue, completionRate, highPriority, dueSoon, total };
  }, [tasks, today]);

  const kanbanColumns = useMemo(() => {
    const normalizedStatus = (task) => String(task.status || '').toUpperCase();

    return [
      {
        id: 'TO_DO',
        title: 'To Do',
        tasks: tasks.filter((task) => {
          const status = normalizedStatus(task);
          return status === 'TO_DO' || status === 'PENDING_ACCEPTANCE' || status === 'NEGOTIATING' || status === 'CHANGE_REQUESTED';
        }),
      },
      {
        id: 'IN_PROGRESS',
        title: 'In Progress',
        tasks: tasks.filter((task) => normalizedStatus(task) === 'IN_PROGRESS'),
      },
      {
        id: 'DONE',
        title: 'Done',
        tasks: tasks.filter((task) => normalizedStatus(task) === 'DONE'),
      },
    ];
  }, [tasks]);

  const aiRecommendations = useMemo(() => {
    const recs = [];
    if (taskSummary.highPriority.length > 0) {
      recs.push(`You have ${taskSummary.highPriority.length} high-priority task${taskSummary.highPriority.length === 1 ? '' : 's'} that still needs attention.`);
    }
    if (taskSummary.overdue > 0) {
      recs.push(`There are ${taskSummary.overdue} overdue task${taskSummary.overdue === 1 ? '' : 's'}. Tackle one during your next study block.`);
    }
    if (taskSummary.dueSoon > 0) {
      recs.push(`${taskSummary.dueSoon} task${taskSummary.dueSoon === 1 ? '' : 's'} are due within 3 days. Prioritise them first.`);
    }
    if (taskSummary.pending > 0) {
      recs.push(`Resolve ${taskSummary.pending} pending acknowledgement${taskSummary.pending === 1 ? '' : 's'} to free up team coordination.`);
    }
    if (recs.length === 0) {
      recs.push('Your current workload is balanced. Keep moving forward with your next deliverable.');
    }
    return recs.slice(0, 4);
  }, [taskSummary]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading your productivity workspace..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      <div className="space-y-3">
        <p className="sg-eyebrow">Personal Task View</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">My Tasks</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tasks assigned to {user?.full_name || user?.email || 'you'} with accountability, priority, and progress clearly surfaced.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200/70 dark:border-slate-800">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pending Tasks</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.pending}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Awaiting acknowledgement or review.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/70 dark:border-slate-800">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Completed Tasks</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.completed}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tasks finished by you this cycle.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/70 dark:border-slate-800">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Overdue Tasks</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.overdue}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tasks that need immediate follow-up.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/70 dark:border-slate-800">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Completion Rate</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.completionRate}%</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Of {taskSummary.total} total tasks.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {kanbanColumns.map((column) => (
              <Card key={column.id} className="border-slate-200/70 dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>{column.title}</CardTitle>
                      <CardDescription>{column.tasks.length} task{column.tasks.length === 1 ? '' : 's'}</CardDescription>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {column.tasks.length}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {column.tasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No tasks in this column yet.
                    </div>
                  ) : (
                    column.tasks.map((task) => {
                      const badge = accountabilityBadge(task);
                      const priority = priorityConfig(task.priority);
                      return (
                        <div key={task.task_id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-slate-500 dark:text-slate-400">{statusIcon(task.status)}</span>
                                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{task.title}</p>
                              </div>
                              {task.description && (
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{task.description}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                              <Badge variant={priority.variant}>{priority.label}</Badge>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            {task.due_date && (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                Due {formatDate(task.due_date)}
                              </span>
                            )}
                            <span>{task.group_name || 'Team workspace'}</span>
                            <span>Assigned to {task.assigned_to_name || task.assigned_to_email || 'you'}</span>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                              <span>Progress</span>
                              <span>{taskProgressValue(task)}%</span>
                            </div>
                            <Progress value={taskProgressValue(task)} className="h-2 rounded-full" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200/70 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Productivity Snapshot</CardTitle>
              <CardDescription>A quick look at your performance and workload balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Finished</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.completed}</p>
                </div>
                <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Due Soon</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.dueSoon}</p>
                </div>
                <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Pace</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.completionRate}%</p>
                </div>
                <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Tasks</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{taskSummary.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 dark:border-slate-800">
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>Suggested actions to improve your current workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {aiRecommendations.map((tip, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3 text-sm text-slate-700 dark:text-slate-300">
                  {tip}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
