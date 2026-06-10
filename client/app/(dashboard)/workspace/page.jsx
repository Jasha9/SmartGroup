'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups, deleteGroup, getGroupMembers, addGroupMember } from '@/services/groupService';
import { getTasks, updateTaskStatus } from '@/services/taskService';
import { getContributions } from '@/services/contributionService';
import { getCharter } from '@/services/charterService';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import CreateGroupButton from '@/components/workspace/CreateGroupButton';
import CreateGroupModal from '@/components/workspace/CreateGroupModal';
import AddTaskModal from '@/components/workspace/AddTaskModal';
import { Plus, Clock, Users, UserPlus, Activity, ShieldCheck } from 'lucide-react';

const COLUMNS = [
  {
    id: 'TO_DO',
    title: 'TO_DO',
    color: 'bg-slate-100 dark:bg-slate-800/60',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  {
    id: 'IN_PROGRESS',
    title: 'IN_PROGRESS',
    color: 'bg-teal-50 dark:bg-teal-900/20',
    textColor: 'text-teal-700 dark:text-teal-300',
  },
  {
    id: 'DONE',
    title: 'DONE',
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
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState('');
  const [contributions, setContributions] = useState([]);
  const [responsibilities, setResponsibilities] = useState([]);

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

  const fetchGroupMembers = useCallback(async (group) => {
    if (!group) {
      setGroupMembers([]);
      return;
    }
    setMembersLoading(true);
    try {
      const groupId = group.group_id || group.id;
      const data = await getGroupMembers(groupId);
      setGroupMembers(data?.data?.members || []);
    } catch {
      setGroupMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchTeamMeta = useCallback(async (group) => {
    if (!group) {
      setContributions([]);
      setResponsibilities([]);
      return;
    }

    const groupId = group.group_id || group.id;
    const [contribRes, charterRes] = await Promise.allSettled([
      getContributions(groupId),
      getCharter(groupId),
    ]);

    if (contribRes.status === 'fulfilled') {
      setContributions(contribRes.value?.data?.contributions || contribRes.value?.contributions || []);
    } else {
      setContributions([]);
    }

    if (charterRes.status === 'fulfilled') {
      setResponsibilities(charterRes.value?.data?.responsibilities || []);
    } else {
      setResponsibilities([]);
    }
  }, []);

  useEffect(() => {
    fetchGroupMembers(selectedGroup);
    fetchTeamMeta(selectedGroup);
  }, [selectedGroup, fetchGroupMembers, fetchTeamMeta]);

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
      setContributions([]);
      setResponsibilities([]);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to delete group. Please try again.');
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup) return;
    const email = newMemberEmail.trim().toLowerCase();
    if (!email) {
      setMemberActionError('Enter an email to add a member.');
      return;
    }

    try {
      setMemberActionLoading(true);
      setMemberActionError('');
      const groupId = selectedGroup.group_id || selectedGroup.id;
      const result = await addGroupMember(groupId, { email });
      setGroupMembers(result?.data?.members || []);
      setNewMemberEmail('');
    } catch (err) {
      setMemberActionError(err.response?.data?.error || 'Failed to add member.');
    } finally {
      setMemberActionLoading(false);
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

  const memberCards = useMemo(() => {
    return groupMembers.map((member) => {
      const contribution = contributions.find((c) => c.user_id === member.user_id || c.email === member.email);
      const tasksOwned = tasks.filter((t) => t.assigned_to_email === member.email || t.assigned_to_name === member.full_name);
      const inFlight = tasksOwned.filter((t) => t.status !== 'DONE').length;
      return {
        ...member,
        accountability: contribution?.percentage ?? 0,
        workload: inFlight,
      };
    });
  }, [groupMembers, contributions, tasks]);

  const pendingResponsibility = useMemo(() => {
    return responsibilities.filter((r) => !r.is_signed);
  }, [responsibilities]);

  const activityFeed = useMemo(() => {
    const items = [];
    tasks
      .filter((t) => t.status === 'DONE')
      .slice(0, 2)
      .forEach((t) => {
        items.push(`${t.assigned_to_name || t.assigned_to_email || 'A member'} completed ${t.title}`);
      });

    responsibilities
      .filter((r) => r.status === 'negotiating')
      .slice(0, 2)
      .forEach((r) => {
        items.push(`${r.full_name || r.email} requested a task swap for ${r.task_title}`);
      });

    responsibilities
      .filter((r) => r.is_signed)
      .slice(0, 2)
      .forEach((r) => {
        items.push(`${r.full_name || r.email} accepted ${r.task_title}`);
      });

    return items.slice(0, 5);
  }, [tasks, responsibilities]);

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading workspace..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p className="sg-eyebrow">Team Collaboration Hub</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">Team Space</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{groupName || 'No group selected'}</p>
          </div>
          <CreateGroupButton onGroupCreated={handleGroupCreated} />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {selectedGroup && (
            <>
              <Button variant="teal" onClick={() => setIsTaskModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
              <Button variant="outline" onClick={openEditGroup}>
                Edit Group
              </Button>
              <Button variant="destructive" onClick={handleDeleteGroup}>
                Delete Group
              </Button>
            </>
          )}
        </div>
      </div>

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
                    ? 'bg-[#0f172a] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {g.group_name || g.name}
              </button>
            );
          })}
        </div>
      )}

      {groups.length === 0 && (
        <Card>
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">Create your first team to begin planning.</p>
          </div>
        </Card>
      )}

      {(error || actionError) && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error || actionError}
        </div>
      )}

      {selectedGroup && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="p-5 xl:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Team Members</h3>
            </div>

            <div className="w-full md:w-auto flex gap-2 mb-4">
              <input
                type="email"
                placeholder="member@gmail.com"
                value={newMemberEmail}
                onChange={(e) => {
                  setNewMemberEmail(e.target.value);
                  setMemberActionError('');
                }}
                className="w-full md:w-72 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
              <Button onClick={handleAddMember} disabled={memberActionLoading}>
                <UserPlus className="w-4 h-4" />
                {memberActionLoading ? 'Adding...' : 'Add Member'}
              </Button>
            </div>

            {memberActionError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{memberActionError}</p>
            )}

            {membersLoading ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading members...</p>
            ) : memberCards.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No members yet. Add your team to begin assigning ownership.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {memberCards.map((member) => (
                  <div key={member.user_id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 text-white flex items-center justify-center text-xs font-semibold">
                        {getInitials(member.full_name || member.email)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.full_name || member.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Accountability Score</span>
                      <strong className="text-indigo-600 dark:text-indigo-300">{member.accountability}%</strong>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Current workload</span>
                      <strong>{member.workload} active tasks</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Responsibility Tracker</h3>
            </div>
            {pendingResponsibility.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">All current responsibilities are acknowledged.</p>
            ) : (
              <div className="space-y-3">
                {pendingResponsibility.slice(0, 5).map((r) => (
                  <div key={r.charter_id} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/15 p-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.task_title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Awaiting acknowledgement from {r.full_name || r.email}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {selectedGroup && (
        <>
          {loadingTasks ? (
            <div className="flex items-center justify-center h-48">
              <LoadingState message="Loading tasks..." />
            </div>
          ) : tasks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                SmartGroup Assistant is ready to help. Generate your first project plan.
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
                          moveOptions.push({ label: 'Move to IN_PROGRESS', status: 'IN_PROGRESS' });
                          moveOptions.push({ label: 'Move to DONE', status: 'DONE' });
                        } else if (task.status === 'IN_PROGRESS') {
                          moveOptions.push({ label: 'Move to DONE', status: 'DONE' });
                        }

                        return (
                          <div
                            key={task.task_id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors">
                                {task.title}
                              </p>
                              <Badge variant={priorityCfg.badge}>{priorityCfg.label}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
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

                      <button onClick={() => setIsTaskModalOpen(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-600 dark:hover:text-teal-300 text-sm transition-all">
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

      {selectedGroup && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Team Activity Feed</h3>
          </div>
          {activityFeed.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Team activity will appear here as members acknowledge and complete responsibilities.</p>
          ) : (
            <div className="space-y-2">
              {activityFeed.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-800/35">
                  {item}
                </div>
              ))}
            </div>
          )}
        </Card>
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
