'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups } from '@/services/groupService';
import { getTasks } from '@/services/taskService';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import CreateGroupButton from '@/components/workspace/CreateGroupButton';
import { Plus, Clock } from 'lucide-react';

const COLUMNS = [
  {
    id: 'TO_DO',
    title: 'To Do',
    color: 'bg-slate-100 dark:bg-slate-800/60',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    color: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    id: 'DONE',
    title: 'Done',
    color: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
];

const PRIORITY_CONFIG = {
  HIGH: { badge: 'destructive', label: 'High' },
  MEDIUM: { badge: 'warning', label: 'Medium' },
  LOW: { badge: 'default', label: 'Low' },
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

export default function GroupWorkspacePage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await getGroups();
        const list = data?.data?.groups || data?.groups || [];
        setGroups(list);
        if (list.length > 0) setSelectedGroup(list[0]);
      } catch {
        setError('Failed to load groups. Please try again.');
      } finally {
        setLoadingGroups(false);
      }
    }
    fetchGroups();
  }, []);

  const fetchTasks = useCallback(async (group) => {
    if (!group) return;
    setLoadingTasks(true);
    setError(null);
    try {
      const groupId = group.group_id || group.id;
      const data = await getTasks(groupId);
      setTasks(data?.data?.tasks || data?.tasks || []);
    } catch {
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(selectedGroup);
  }, [selectedGroup, fetchTasks]);

  const handleGroupCreated = useCallback(async () => {
    try {
      const data = await getGroups();
      const list = data?.data?.groups || data?.groups || [];
      setGroups(list);
      if (list.length > 0 && !selectedGroup) setSelectedGroup(list[0]);
    } catch {
      // ignore refresh error
    }
  }, [selectedGroup]);

  const groupName = selectedGroup?.group_name || selectedGroup?.name || '';

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading workspace..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Group Workspace</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {groupName || 'No group selected'}
            </p>
          </div>
          <CreateGroupButton onGroupCreated={handleGroupCreated} />
        </div>
        {selectedGroup && (
          <Button disabled>
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        )}
      </div>

      {/* Group selector */}
      {groups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => {
            const gId = g.group_id || g.id;
            const selId = selectedGroup?.group_id || selectedGroup?.id;
            return (
              <button
                key={gId}
                onClick={() => setSelectedGroup(g)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  gId === selId
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {g.group_name || g.name}
              </button>
            );
          })}
        </div>
      )}

      {/* No groups */}
      {groups.length === 0 && (
        <Card>
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No groups yet</p>
            <p className="text-sm mt-1">Create your first group to begin.</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Kanban */}
      {selectedGroup && (
        <>
          {loadingTasks ? (
            <div className="flex items-center justify-center h-48">
              <LoadingState message="Loading tasks..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {COLUMNS.map(({ id: colId, title, color, textColor }) => {
                const colTasks = tasks.filter((t) => t.status === colId);
                return (
                  <div key={colId} className="flex flex-col gap-3">
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${color}`}>
                      <span className={`font-semibold text-sm ${textColor}`}>{title}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/50 ${textColor}`}>
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {tasks.length === 0 && colId === 'TO_DO' && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6 px-2">
                          No tasks yet. Generate tasks using the AI Planner or create one manually.
                        </p>
                      )}

                      {colTasks.map((task) => {
                        const assigneeName = task.assigned_to_name || null;
                        const isMe =
                          user &&
                          (task.assigned_to_name === user.full_name ||
                            task.assigned_to_email === user.email);
                        const priority = (task.priority || 'MEDIUM').toUpperCase();
                        const priorityCfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;

                        return (
                          <div
                            key={task.task_id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {task.title}
                              </p>
                              <Badge variant={priorityCfg.badge}>{priorityCfg.label}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
                                  {getInitials(assigneeName)}
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {assigneeName
                                    ? isMe
                                      ? `${assigneeName} (You)`
                                      : assigneeName
                                    : 'Unassigned'}
                                </span>
                              </div>
                              {task.due_date && (
                                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(task.due_date)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-all">
                        <Plus className="w-4 h-4" />
                        Add a task
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
