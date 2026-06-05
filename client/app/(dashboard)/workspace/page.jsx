'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups, updateGroup, deleteGroup } from '@/services/groupService';
import { getTasks, createTask, updateTaskStatus } from '@/services/taskService';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import CreateGroupButton from '@/components/workspace/CreateGroupButton';
import CreateGroupModal from '@/components/workspace/CreateGroupModal';
import AddTaskModal from '@/components/workspace/AddTaskModal';
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
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalGroup, setGroupModalGroup] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  const refreshGroups = useCallback(async () => {
    try {
      const data = await getGroups();
      const list = data?.data?.groups || data?.groups || [];
      setGroups(list);
      return list;
    } catch {
      setError('Failed to load groups. Please try again.');
      return [];
    }
  }, []);

  useEffect(() => {
    async function loadGroups() {
      const list = await refreshGroups();
      if (list.length > 0) setSelectedGroup(list[0]);
      setLoadingGroups(false);
    }
    loadGroups();
  }, [refreshGroups]);

  const fetchTasks = useCallback(async (group) => {
    if (!group) {
      setTasks([]);
      return;
    }
    setLoadingTasks(true);
    setError(null);
    try {
      const groupId = group.group_id || group.id;
      const data = await getTasks(groupId);
      setTasks(data?.data?.tasks || data?.tasks || []);
    } catch {
      setError('Failed to load tasks. Please try again.');
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(selectedGroup);
  }, [selectedGroup, fetchTasks]);

  const handleGroupCreated = useCallback(async () => {
    const list = await refreshGroups();
    if (selectedGroup) {
      const active = list.find((g) => (g.group_id || g.id) === (selectedGroup.group_id || selectedGroup.id));
      setSelectedGroup(active || list[0] || null);
    } else if (list.length > 0) {
      setSelectedGroup(list[0]);
    }
  }, [refreshGroups, selectedGroup]);

  const handleGroupUpdated = useCallback(async () => {
    const list = await refreshGroups();
    const active = list.find((g) => (g.group_id || g.id) === (selectedGroup?.group_id || selectedGroup?.id));
    setSelectedGroup(active || list[0] || null);
  }, [refreshGroups, selectedGroup]);

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    const confirmDelete = window.confirm('Delete this group and all its tasks? This cannot be undone.');
    if (!confirmDelete) return;
    try {
      setActionError(null);
      const groupId = selectedGroup.group_id || selectedGroup.id;
      await deleteGroup(groupId);
      const list = await refreshGroups();
      setSelectedGroup(list[0] || null);
      setTasks([]);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to delete group. Please try again.');
    }
  };

  const openEditGroup = () => {
    setGroupModalGroup(selectedGroup);
    setIsGroupModalOpen(true);
  };

  const handleTaskCreated = (newTask) => {
    if (!newTask) {
      fetchTasks(selectedGroup);
      return;
    }
    setTasks((prev) => [...prev, newTask]);
  };

  const handleMoveTask = async (taskId, newStatus) => {
    try {
      setActionError(null);
      const result = await updateTaskStatus(taskId, newStatus);
      const updatedTask = result?.data || result?.task || result;
      setTasks((prev) => prev.map((task) => {
        const id = task.task_id || task.id;
        if (id === taskId) {
          return { ...task, ...updatedTask };
        }
        return task;
      }));
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update task status.');
    }
  };

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Group Workspace</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {groupName || 'No group selected'}
            </p>
          </div>
          <CreateGroupButton onGroupCreated={handleGroupCreated} />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {selectedGroup && (
            <>
              <Button variant="outline" onClick={() => setIsTaskModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
              <Button variant="secondary" onClick={openEditGroup}>
                Edit Group
              </Button>
              <Button variant="destructive" onClick={handleDeleteGroup}>
                Delete Group
              </Button>
            </>
          )}
        </div>
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
      {(error || actionError) && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error || actionError}
        </div>
      )}

      {/* Kanban */}
      {selectedGroup && (
        <>
          {loadingTasks ? (
            <div className="flex items-center justify-center h-48">
              <LoadingState message="Loading tasks..." />
            </div>
          ) : tasks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                No accepted tasks yet.
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Accept assigned responsibilities to begin or create a new task for this group.
              </p>
              <Button className="mt-6" onClick={() => setIsTaskModalOpen(true)}>
                Add a task
              </Button>
            </Card>
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
                        const moveOptions = [];
                        if (task.status === 'TO_DO') {
                          moveOptions.push({ label: 'Move to In Progress', status: 'IN_PROGRESS' });
                          moveOptions.push({ label: 'Move to Done', status: 'DONE' });
                        } else if (task.status === 'IN_PROGRESS') {
                          moveOptions.push({ label: 'Move to Done', status: 'DONE' });
                        }

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
                            {moveOptions.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {moveOptions.map((option) => (
                                  <button
                                    key={option.status}
                                    type="button"
                                    onClick={() => handleMoveTask(task.task_id || task.id, option.status)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button onClick={() => setIsTaskModalOpen(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-all">
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

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={(groupData) => {
          setIsGroupModalOpen(false);
          if (groupData) {
            handleGroupUpdated();
          }
        }}
        group={groupModalGroup}
      />

      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={(taskData) => {
          setIsTaskModalOpen(false);
          if (taskData) {
            handleTaskCreated(taskData);
          }
        }}
        groupId={selectedGroup?.group_id || selectedGroup?.id}
      />
    </div>
  );
}
