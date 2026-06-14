'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroupMembers } from '@/services/groupService';
import { markNotificationsReadByContext } from '@/services/notificationService';
import { subscribeDataSync } from '@/lib/dataSync';
import {
  acceptTask,
  addTaskComment,
  addTaskSubtask,
  getMyTasks,
  getTaskComments,
  getTaskSubtasks,
  requestTaskChange,
  updateTaskStatus,
  updateTaskSubtask,
} from '@/services/taskService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import LoadingState from '@/components/ui/LoadingState';
import Modal from '@/components/ui/Modal';
import { CalendarClock, CheckCircle2, Clock3, MessageSquareWarning } from 'lucide-react';

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 3;
const TASK_TABS = ['DETAILS', 'COMMENTS', 'SUBTASKS', 'ACTIVITY'];
const TASK_VIEWS = ['LIST', 'KANBAN'];
const KANBAN_COLUMNS = ['TO_DO', 'IN_PROGRESS', 'DONE'];

const URGENCY_CONFIG = {
  OVERDUE: { rank: 0, label: 'Overdue', badge: 'destructive' },
  DUE_TODAY: { rank: 1, label: 'Due Today', badge: 'warning' },
  DUE_SOON: { rank: 2, label: 'Due Soon', badge: 'blue' },
  UPCOMING: { rank: 3, label: 'Upcoming', badge: 'default' },
  NO_DUE_DATE: { rank: 4, label: 'No Due Date', badge: 'default' },
};

function dateOnly(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getUrgencyKey(dueDate) {
  if (!dueDate) return 'NO_DUE_DATE';
  const due = dateOnly(dueDate);
  if (!due) return 'NO_DUE_DATE';

  const today = dateOnly(new Date());
  const diffDays = Math.floor((due.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) return 'OVERDUE';
  if (diffDays === 0) return 'DUE_TODAY';
  if (diffDays <= DUE_SOON_DAYS) return 'DUE_SOON';
  return 'UPCOMING';
}

function dueSortValue(dueDate) {
  if (!dueDate) return Number.POSITIVE_INFINITY;
  const d = new Date(dueDate).getTime();
  return Number.isNaN(d) ? Number.POSITIVE_INFINITY : d;
}

function sortByUrgencyThenDate(aDue, bDue) {
  const aUrgency = URGENCY_CONFIG[getUrgencyKey(aDue)]?.rank ?? 4;
  const bUrgency = URGENCY_CONFIG[getUrgencyKey(bDue)]?.rank ?? 4;
  if (aUrgency !== bUrgency) return aUrgency - bUrgency;
  return dueSortValue(aDue) - dueSortValue(bDue);
}

function formatDate(dateStr) {
  if (!dateStr) return 'No due date';
  const value = new Date(dateStr);
  if (Number.isNaN(value.getTime())) return 'No due date';
  return value.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Unknown time';
  const value = new Date(dateStr);
  if (Number.isNaN(value.getTime())) return 'Unknown time';
  return value.toLocaleString('en-AU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeStatus(status) {
  return String(status || '').toUpperCase();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function statusBadgeVariant(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'DONE') return 'accepted';
  if (normalized === 'IN_PROGRESS') return 'blue';
  if (normalized === 'PENDING_ACCEPTANCE') return 'pending';
  if (normalized === 'NEGOTIATING' || normalized === 'CHANGE_REQUESTED') return 'negotiating';
  return 'default';
}

function statusLabel(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) return 'Unknown';
  return normalized
    .split('_')
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(' ');
}

function truncateText(value, max = 120) {
  const text = String(value || '').trim();
  if (!text) return 'No description provided.';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function normalizeGroupedShape(list) {
  return list.map((section, index) => {
    const tasks = Array.isArray(section.tasks) ? section.tasks : [];
    return {
      assessment_id: section.assessment_id || `assessment-${index}`,
      assessment_title: section.assessment_title || 'Unassigned Assessment',
      group_id: section.group_id || `group-${index}`,
      group_name: section.group_name || 'Unknown Group',
      due_date: section.due_date || null,
      tasks: tasks.map((task, taskIndex) => ({
        task_id: task.task_id || task.taskId || task.id || `${index}-${taskIndex}`,
        title: task.title || 'Untitled Task',
        description: task.description || '',
        status: task.status || 'TO_DO',
        priority: task.priority || 'MEDIUM',
        due_date: task.due_date || null,
        assessment_title: section.assessment_title || 'Unassigned Assessment',
        group_name: section.group_name || 'Unknown Group',
        group_id: task.group_id || section.group_id || null,
        progress_percentage: task.progress_percentage || 0,
        subtask_total: task.subtask_total || 0,
        subtask_completed: task.subtask_completed || 0,
        assigned_to_email: task.assigned_to_email || null,
        created_at: task.created_at || null,
        updated_at: task.updated_at || null,
      })),
    };
  });
}

function normalizeFlatShape(list) {
  const sections = new Map();

  list.forEach((task, index) => {
    const assessmentId = task.assessment_id || task.assessment_title || `ungrouped-${index}`;
    const groupId = task.group_id || null;
    const groupKey = groupId || task.group_name || `unknown-group-${index}`;
    const key = `${assessmentId}::${groupKey}`;

    if (!sections.has(key)) {
      sections.set(key, {
        assessment_id: task.assessment_id || key,
        assessment_title: task.assessment_title || 'Unassigned Assessment',
        group_id: task.group_id || null,
        group_name: task.group_name || 'Unknown Group',
        due_date: task.assessment_due_date || null,
        tasks: [],
      });
    }

    sections.get(key).tasks.push({
      task_id: task.task_id || task.taskId || task.id || `${key}-${index}`,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: task.status || 'TO_DO',
      priority: task.priority || 'MEDIUM',
      due_date: task.due_date || null,
      assessment_title: task.assessment_title || 'Unassigned Assessment',
      group_name: task.group_name || 'Unknown Group',
      group_id: task.group_id || null,
      progress_percentage: task.progress_percentage || 0,
      subtask_total: task.subtask_total || 0,
      subtask_completed: task.subtask_completed || 0,
      assigned_to_email: task.assigned_to_email || null,
      created_at: task.created_at || null,
      updated_at: task.updated_at || null,
    });
  });

  return Array.from(sections.values()).map((section) => {
    if (!section.due_date) {
      const earliestTaskDue = section.tasks
        .map((task) => task.due_date)
        .filter(Boolean)
        .sort(sortByUrgencyThenDate)[0];
      return {
        ...section,
        due_date: earliestTaskDue || null,
      };
    }

    return section;
  });
}

function normalizeMyTasksResponse(payload) {
  const groupedFromApi = Array.isArray(payload?.data) ? payload.data : null;
  if (groupedFromApi) {
    return normalizeGroupedShape(groupedFromApi);
  }

  const flatList = payload?.data?.tasks || payload?.tasks || [];
  return normalizeFlatShape(Array.isArray(flatList) ? flatList : []);
}

function highlightMentions(text) {
  const value = String(text || '');
  const parts = value.split(/(@[a-zA-Z0-9._%+-]+(?:@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})?)/g);

  return parts.map((part, idx) => {
    if (/^@[a-zA-Z0-9._%+-]+(?:@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})?$/.test(part)) {
      return (
        <span key={`mention-${idx}`} className="text-teal-700 dark:text-teal-300 font-semibold">
          {part}
        </span>
      );
    }

    return <span key={`text-${idx}`}>{part}</span>;
  });
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [taskView, setTaskView] = useState('LIST');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTaskTab, setActiveTaskTab] = useState('DETAILS');

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [subtasks, setSubtasks] = useState([]);
  const [subtasksLoading, setSubtasksLoading] = useState(false);
  const [subtaskError, setSubtaskError] = useState(null);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [subtaskBusyId, setSubtaskBusyId] = useState(null);
  const [addingSubtask, setAddingSubtask] = useState(false);

  const [isRequestChangeOpen, setIsRequestChangeOpen] = useState(false);
  const [requestTask, setRequestTask] = useState(null);
  const [requestMembers, setRequestMembers] = useState([]);
  const [requestMembersLoading, setRequestMembersLoading] = useState(false);
  const [requestTo, setRequestTo] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestError, setRequestError] = useState(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const loadMyTasks = useCallback(async () => {
    try {
      setError(null);
      const response = await getMyTasks();
      setSections(normalizeMyTasksResponse(response));
    } catch {
      setError('Unable to load your tasks. Please try again.');
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyTasks();
  }, [loadMyTasks]);

  useEffect(() => {
    const unsubscribe = subscribeDataSync(() => {
      loadMyTasks();
    });

    const onFocus = () => {
      loadMyTasks();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [loadMyTasks]);

  const sortedSections = useMemo(() => {
    return sections
      .map((section) => {
        const sortedTasks = [...section.tasks].sort((a, b) => sortByUrgencyThenDate(a.due_date, b.due_date));
        const doneCount = sortedTasks.filter((task) => normalizeStatus(task.status) === 'DONE').length;

        return {
          ...section,
          tasks: sortedTasks,
          doneCount,
          totalCount: sortedTasks.length,
          urgencyKey: getUrgencyKey(section.due_date),
        };
      })
      .sort((a, b) => sortByUrgencyThenDate(a.due_date, b.due_date));
  }, [sections]);

  const totalTaskCount = sortedSections.reduce((count, section) => count + section.tasks.length, 0);

  const loadComments = useCallback(async (taskId) => {
    setCommentsLoading(true);
    setCommentError(null);
    try {
      const response = await getTaskComments(taskId);
      setComments(response?.data?.comments || response?.comments || []);
    } catch {
      setCommentError('Unable to load comments. Please try again.');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const loadSubtasks = useCallback(async (taskId) => {
    setSubtasksLoading(true);
    setSubtaskError(null);
    try {
      const response = await getTaskSubtasks(taskId);
      setSubtasks(response?.data?.subtasks || response?.subtasks || []);
    } catch {
      setSubtaskError('Unable to load subtasks. Please try again.');
      setSubtasks([]);
    } finally {
      setSubtasksLoading(false);
    }
  }, []);

  const openTaskModal = async (task, defaultTab = 'DETAILS') => {
    setSelectedTask(task);
    setCommentDraft('');
    setSubtaskDraft('');
    setActiveTaskTab(defaultTab);
    setIsTaskModalOpen(true);

    if (task?.task_id) {
      // Viewing task details counts as reviewing task-related notices.
      markNotificationsReadByContext({ taskId: task.task_id }).catch(() => null);
    }

    await Promise.all([loadComments(task.task_id), loadSubtasks(task.task_id)]);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setComments([]);
    setCommentDraft('');
    setCommentError(null);
    setSubtasks([]);
    setSubtaskDraft('');
    setSubtaskError(null);
    setActiveTaskTab('DETAILS');
  };

  const submitComment = async () => {
    if (!selectedTask?.task_id) return;
    const text = commentDraft.trim();
    if (!text) return;

    setSubmittingComment(true);
    setCommentError(null);
    try {
      await addTaskComment(selectedTask.task_id, text);
      setCommentDraft('');
      await loadComments(selectedTask.task_id);
    } catch {
      setCommentError('Unable to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const canEditSubtasks = useMemo(() => {
    if (!selectedTask || !user) return false;
    return selectedTask.assigned_to_email === user.email;
  }, [selectedTask, user]);

  const submitSubtask = async () => {
    if (!selectedTask?.task_id) return;
    if (!subtaskDraft.trim()) return;

    setAddingSubtask(true);
    setSubtaskError(null);
    try {
      await addTaskSubtask(selectedTask.task_id, subtaskDraft.trim());
      setSubtaskDraft('');
      await Promise.all([loadSubtasks(selectedTask.task_id), loadMyTasks()]);
    } catch {
      setSubtaskError('Unable to add subtask. Please try again.');
    } finally {
      setAddingSubtask(false);
    }
  };

  const toggleSubtask = async (subtask) => {
    if (!selectedTask?.task_id) return;

    setSubtaskBusyId(subtask.subtask_id);
    setSubtaskError(null);
    try {
      await updateTaskSubtask(selectedTask.task_id, subtask.subtask_id, {
        is_completed: !Boolean(subtask.is_completed),
      });
      await Promise.all([loadSubtasks(selectedTask.task_id), loadMyTasks()]);
    } catch {
      setSubtaskError('Unable to update subtask. Please try again.');
    } finally {
      setSubtaskBusyId(null);
    }
  };

  const openRequestChangeModal = async (task) => {
    setRequestTask(task);
    setIsRequestChangeOpen(true);
    setRequestError(null);
    setRequestReason('');
    setRequestTo('');
    setRequestMembersLoading(true);

    try {
      const groupId = String(task.group_id || '').trim();
      if (!isUuid(groupId)) {
        setRequestError('Unable to identify this task group. Refresh and try again.');
        setRequestMembers([]);
        return;
      }

      const data = await getGroupMembers(groupId);
      const members = data?.data?.members || data?.members || [];
      const normalized = members
        .map((member) => ({
          ...member,
          member_id: member.user_id || member.id || null,
        }))
        .filter((member) => member.member_id && member.member_id !== user?.user_id);
      setRequestMembers(normalized);
    } catch {
      setRequestError('Unable to load group members for request change.');
      setRequestMembers([]);
    } finally {
      setRequestMembersLoading(false);
    }
  };

  const closeRequestChangeModal = () => {
    setIsRequestChangeOpen(false);
    setRequestTask(null);
    setRequestMembers([]);
    setRequestTo('');
    setRequestReason('');
    setRequestError(null);
    setRequestMembersLoading(false);
    setRequestSubmitting(false);
  };

  const submitRequestChange = async () => {
    if (!requestTask?.task_id) return;

    if (!requestTo) {
      setRequestError('Please select a teammate for this request.');
      return;
    }

    const reason = requestReason.trim();
    if (!reason) {
      setRequestError('Please add a reason for your request.');
      return;
    }

    if (requestTo === user?.user_id) {
      setRequestError('You cannot request change with yourself.');
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);
    try {
      await requestTaskChange(requestTask.task_id, {
        requested_to: requestTo,
        reason,
      });
      closeRequestChangeModal();
      await loadMyTasks();
    } catch {
      setRequestError('Unable to request change. Please try again.');
      setRequestSubmitting(false);
    }
  };

  const handleAcceptTask = async (taskId) => {
    setUpdatingTaskId(taskId);
    setActionError(null);
    try {
      await acceptTask(taskId);
      await loadMyTasks();
    } catch (err) {
      const message = err?.response?.data?.error || 'Unable to update task status. Please try again.';
      setActionError(message);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    if (!isUuid(taskId)) {
      setActionError('This task is missing a valid ID. Please refresh and try again.');
      return;
    }

    setUpdatingTaskId(taskId);
    setActionError(null);
    try {
      await updateTaskStatus(taskId, status);
      await loadMyTasks();
    } catch (err) {
      const message = err?.response?.data?.error || 'Unable to update task status. Please try again.';
      setActionError(message);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading your tasks..." />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="space-y-1">
        <p className="sg-eyebrow">Personal Task View</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Tasks</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Tasks assigned to {user?.full_name || user?.email || 'you'}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TASK_VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setTaskView(view)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              taskView === view
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {view === 'LIST' ? 'List View' : 'Kanban View'}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          Unable to load your tasks. Please try again.
        </div>
      )}

      {!error && actionError && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
          {actionError}
        </div>
      )}

      {!error && totalTaskCount === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-slate-500 dark:text-slate-400">
            <p className="text-base font-medium">No tasks assigned to you yet. Once your team assigns responsibilities, they will appear here.</p>
          </CardContent>
        </Card>
      ) : taskView === 'LIST' ? (
        <div className="space-y-4">
          {sortedSections.map((section) => {
            const urgency = URGENCY_CONFIG[section.urgencyKey] || URGENCY_CONFIG.NO_DUE_DATE;
            const progressValue = section.totalCount > 0 ? (section.doneCount / section.totalCount) * 100 : 0;

            return (
              <Card key={`${section.assessment_id}-${section.group_id}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-lg truncate">{section.assessment_title}</CardTitle>
                      <CardDescription className="text-sm">
                        {section.group_name}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant={urgency.badge}>{urgency.label}</Badge>
                      <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {formatDate(section.due_date)}
                      </div>
                    </div>
                  </div>

                  <Progress
                    value={progressValue}
                    max={100}
                    showPercent
                    label={`${section.doneCount}/${section.totalCount} tasks completed`}
                    className="pt-1"
                  />
                </CardHeader>

                <CardContent className="space-y-2.5">
                  {section.tasks.map((task) => {
                    const status = normalizeStatus(task.status);
                    const taskUrgency = URGENCY_CONFIG[getUrgencyKey(task.due_date)] || URGENCY_CONFIG.NO_DUE_DATE;
                    const isUpdating = updatingTaskId === task.task_id;
                    const priority = String(task.priority || 'MEDIUM').toUpperCase();
                    const taskProgress = Number(task.progress_percentage || 0);

                    return (
                      <div
                        key={task.task_id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3"
                      >
                        <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{task.title}</p>
                              <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
                              <Badge variant={taskUrgency.badge}>{taskUrgency.label}</Badge>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {task.assessment_title || section.assessment_title} · {task.group_name || section.group_name}
                            </p>

                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {truncateText(task.description)}
                            </p>

                            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                Due {formatDate(task.due_date)}
                              </span>
                              <span>Priority: {priority}</span>
                              <span>Subtasks: {task.subtask_completed || 0}/{task.subtask_total || 0}</span>
                            </div>

                            <Progress
                              value={taskProgress}
                              max={100}
                              label="Progress"
                              showPercent
                              className="pt-1"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {status === 'PENDING_ACCEPTANCE' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="teal"
                                  onClick={() => handleAcceptTask(task.task_id)}
                                  disabled={isUpdating}
                                >
                                  Accept Responsibility
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRequestChangeModal(task)}
                                  disabled={isUpdating}
                                >
                                  Request Change
                                </Button>
                              </>
                            )}

                            {status === 'TO_DO' && (
                              <Button
                                size="sm"
                                variant="teal"
                                onClick={() => handleUpdateTaskStatus(task.task_id, 'IN_PROGRESS')}
                                disabled={isUpdating}
                              >
                                Start Task
                              </Button>
                            )}

                            {status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleUpdateTaskStatus(task.task_id, 'DONE')}
                                disabled={isUpdating}
                              >
                                Mark Done
                              </Button>
                            )}

                            {status === 'DONE' && (
                              <Badge variant="accepted" className="h-fit">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Completed
                              </Badge>
                            )}

                            {(status === 'NEGOTIATING' || status === 'CHANGE_REQUESTED') && (
                              <Badge variant="negotiating" className="h-fit">
                                Change Requested
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openTaskModal(task, 'COMMENTS')}
                              disabled={isUpdating}
                            >
                              <MessageSquareWarning className="w-3.5 h-3.5" />
                              Task Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSections.map((section) => {
            const urgency = URGENCY_CONFIG[section.urgencyKey] || URGENCY_CONFIG.NO_DUE_DATE;
            const specialStatuses = section.tasks.filter((task) => {
              const status = normalizeStatus(task.status);
              return status === 'PENDING_ACCEPTANCE' || status === 'NEGOTIATING' || status === 'CHANGE_REQUESTED';
            });

            return (
              <Card key={`kanban-${section.assessment_id}-${section.group_id}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-lg truncate">{section.assessment_title}</CardTitle>
                      <CardDescription className="text-sm">{section.group_name}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant={urgency.badge}>{urgency.label}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {formatDate(section.due_date)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {specialStatuses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Pending and Change Requests</p>
                      {specialStatuses.map((task) => {
                        const status = normalizeStatus(task.status);
                        const isUpdating = updatingTaskId === task.task_id;
                        return (
                          <div key={`special-${task.task_id}`} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/80 dark:bg-slate-900/60">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
                              <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {status === 'PENDING_ACCEPTANCE' && (
                                <>
                                  <Button size="sm" variant="teal" onClick={() => handleAcceptTask(task.task_id)} disabled={isUpdating}>
                                    Accept Responsibility
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openRequestChangeModal(task)} disabled={isUpdating}>
                                    Request Change
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => openTaskModal(task, 'COMMENTS')} disabled={isUpdating}>
                                Task Details
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {KANBAN_COLUMNS.map((column) => {
                      const columnTasks = section.tasks.filter((task) => normalizeStatus(task.status) === column);
                      return (
                        <div key={`${section.assessment_id}-${column}`} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{statusLabel(column)}</p>
                            <Badge variant="default">{columnTasks.length}</Badge>
                          </div>

                          <div className="space-y-2">
                            {columnTasks.length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">No tasks in this column.</p>
                            ) : (
                              columnTasks.map((task) => {
                                const isUpdating = updatingTaskId === task.task_id;
                                const priority = String(task.priority || 'MEDIUM').toUpperCase();
                                return (
                                  <div key={task.task_id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
                                      <Badge variant="default">{priority}</Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Due {formatDate(task.due_date)}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {column === 'TO_DO' && (
                                        <Button size="sm" variant="teal" onClick={() => handleUpdateTaskStatus(task.task_id, 'IN_PROGRESS')} disabled={isUpdating}>
                                          Start Task
                                        </Button>
                                      )}
                                      {column === 'IN_PROGRESS' && (
                                        <Button size="sm" variant="primary" onClick={() => handleUpdateTaskStatus(task.task_id, 'DONE')} disabled={isUpdating}>
                                          Mark Done
                                        </Button>
                                      )}
                                      {column === 'DONE' && <Badge variant="accepted">Completed</Badge>}
                                      <Button size="sm" variant="ghost" onClick={() => openTaskModal(task, 'COMMENTS')} disabled={isUpdating}>
                                        Details
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isTaskModalOpen}
        onClose={closeTaskModal}
        title={selectedTask ? `Task: ${selectedTask.title}` : 'Task Details'}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TASK_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTaskTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  activeTaskTab === tab
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {tab[0] + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {activeTaskTab === 'DETAILS' && selectedTask && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">{selectedTask.description || 'No description provided.'}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{statusLabel(selectedTask.status)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Due Date</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(selectedTask.due_date)}</p>
                </div>
              </div>
              <Progress
                value={Number(selectedTask.progress_percentage || 0)}
                max={100}
                label="Progress"
                showPercent
              />
            </div>
          )}

          {activeTaskTab === 'COMMENTS' && (
            <div className="space-y-4">
              {commentsLoading ? (
                <LoadingState message="Loading comments..." />
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.comment_id}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {comment.full_name || comment.email || 'Team member'}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{formatDateTime(comment.created_at)}</p>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 break-words">
                          {highlightMentions(comment.comment_text)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {commentError && (
                <p className="text-sm text-red-700 dark:text-red-400">{commentError}</p>
              )}

              <div className="space-y-2">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment... use @name to mention a teammate"
                  className="w-full min-h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="teal"
                    onClick={submitComment}
                    disabled={submittingComment || !commentDraft.trim()}
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTaskTab === 'SUBTASKS' && (
            <div className="space-y-3">
              {subtasksLoading ? (
                <LoadingState message="Loading subtasks..." />
              ) : subtasks.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No subtasks yet.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {subtasks.map((subtask) => (
                    <label
                      key={subtask.subtask_id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(subtask.is_completed)}
                        disabled={!canEditSubtasks || subtaskBusyId === subtask.subtask_id}
                        onChange={() => toggleSubtask(subtask)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className={`text-sm ${subtask.is_completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        {subtask.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {subtaskError && <p className="text-sm text-red-700 dark:text-red-400">{subtaskError}</p>}

              <div className="space-y-2">
                <input
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  placeholder="Add a subtask"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={!canEditSubtasks}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="teal"
                    onClick={submitSubtask}
                    disabled={!canEditSubtasks || addingSubtask || !subtaskDraft.trim()}
                  >
                    {addingSubtask ? 'Adding...' : 'Add Subtask'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTaskTab === 'ACTIVITY' && selectedTask && (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                Task created: {formatDateTime(selectedTask.created_at)}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                Last updated: {formatDateTime(selectedTask.updated_at)}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                Comments: {comments.length}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                Subtasks: {subtasks.filter((s) => Boolean(s.is_completed)).length}/{subtasks.length}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isRequestChangeOpen}
        onClose={closeRequestChangeModal}
        title="Request Change"
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">Task title</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{requestTask?.title || '-'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Current assignee</p>
            <p className="text-sm text-slate-700 dark:text-slate-200">{user?.full_name || user?.email || 'You'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Request with / Swap with</label>
            <select
              value={requestTo}
              onChange={(e) => setRequestTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={requestMembersLoading || requestSubmitting}
            >
              <option value="">Select a teammate</option>
              {requestMembers.map((member) => (
                <option key={member.member_id} value={member.member_id}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Write a short reason"
              className="w-full min-h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={requestSubmitting}
            />
          </div>

          {requestError && (
            <p className="text-sm text-red-700 dark:text-red-400">{requestError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={closeRequestChangeModal} disabled={requestSubmitting}>
              Cancel
            </Button>
            <Button variant="teal" size="sm" onClick={submitRequestChange} disabled={requestSubmitting}>
              {requestSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
