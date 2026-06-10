'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyTasks } from '@/services/taskService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import { CheckCircle2, Clock3, CircleDotDashed, MessageSquareWarning, CircleDashed } from 'lucide-react';

const STATUS_GROUPS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'TO_DO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
  { key: 'NEGOTIATING', label: 'Change Requested' },
  { key: 'CHANGE_REQUESTED', label: 'Change Requested' },
];

function statusBadge(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'DONE') return 'accepted';
  if (normalized === 'IN_PROGRESS') return 'blue';
  if (normalized === 'NEGOTIATING' || normalized === 'CHANGE_REQUESTED') return 'warning';
  return 'default';
}

function statusIcon(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'DONE') return <CheckCircle2 className="w-4 h-4" />;
  if (normalized === 'IN_PROGRESS') return <CircleDotDashed className="w-4 h-4" />;
  if (normalized === 'NEGOTIATING' || normalized === 'CHANGE_REQUESTED') return <MessageSquareWarning className="w-4 h-4" />;
  return <CircleDashed className="w-4 h-4" />;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
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

  const grouped = useMemo(() => {
    return STATUS_GROUPS.map((group) => ({
      ...group,
      items: tasks.filter((task) => {
        const normalized = String(task.status || '').toUpperCase();
        if (group.key === 'PENDING') return normalized === 'PENDING_ACCEPTANCE';
        if (group.key === 'NEGOTIATING') return normalized === 'NEGOTIATING' || normalized === 'CHANGE_REQUESTED';
        return normalized === group.key;
      }),
    }));
  }, [tasks]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading your tasks..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="sg-eyebrow">Personal Task View</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">My Tasks</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Tasks assigned to {user?.full_name || user?.email || 'you'}.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!error && tasks.length === 0 ? (
        <Card>
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No tasks assigned to you yet.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.key}>
              <CardHeader>
                <CardTitle>{group.label}</CardTitle>
                <CardDescription>{group.items.length} task{group.items.length === 1 ? '' : 's'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.items.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No tasks in this status.</p>
                ) : (
                  group.items.map((task) => (
                    <div
                      key={task.task_id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-4 py-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500 dark:text-slate-400">{statusIcon(task.status)}</span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{task.title}</p>
                            <Badge variant={statusBadge(task.status)}>{String(task.status || '').replace('_', ' ')}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {task.group_name || 'Team'}
                            {task.assessment_title ? ` · ${task.assessment_title}` : ''}
                          </p>
                          {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{task.description}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-start md:items-end gap-1 text-xs text-slate-500 dark:text-slate-400">
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Clock3 className="w-3 h-3" />
                              Due {formatDate(task.due_date)}
                            </div>
                          )}
                          {task.priority && <span>Priority: {String(task.priority).toUpperCase()}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
