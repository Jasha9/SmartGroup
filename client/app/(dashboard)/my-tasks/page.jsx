'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  acceptTask,
  addTaskComment,
  getMyTasks,
  getTaskComments,
  requestTaskChange,
  updateTaskStatus,
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

function normalizeStatus(status) {
  return String(status || '').toUpperCase();
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
        task_id: task.task_id || task.id || `${index}-${taskIndex}`,
        title: task.title || 'Untitled Task',
        description: task.description || '',
        status: task.status || 'TO_DO',
        priority: task.priority || 'MEDIUM',
        due_date: task.due_date || null,
        assessment_title: section.assessment_title || 'Unassigned Assessment',
        group_name: section.group_name || 'Unknown Group',
      })),
    };
  });
}

function normalizeFlatShape(list) {
  const sections = new Map();

  list.forEach((task, index) => {
    const assessmentId = task.assessment_id || task.assessment_title || `ungrouped-${index}`;
    const groupId = task.group_id || task.group_name || 'unknown-group';
    const key = `${assessmentId}::${groupId}`;

    if (!sections.has(key)) {
      sections.set(key, {
        assessment_id: task.assessment_id || key,
        assessment_title: task.assessment_title || 'Unassigned Assessment',
        group_id: task.group_id || groupId,
        group_name: task.group_name || 'Unknown Group',
        due_date: task.assessment_due_date || null,
        tasks: [],
      });
    }

    sections.get(key).tasks.push({
      task_id: task.task_id || task.id || `${key}-${index}`,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: task.status || 'TO_DO',
      priority: task.priority || 'MEDIUM',
      due_date: task.due_date || null,
      assessment_title: task.assessment_title || 'Unassigned Assessment',
      group_name: task.group_name || 'Unknown Group',
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

export default function MyTasksPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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

  const openCommentsModal = async (task) => {
    setSelectedTask(task);
    setCommentDraft('');
    setIsCommentsOpen(true);
    await loadComments(task.task_id);
  };

  const closeCommentsModal = () => {
    setIsCommentsOpen(false);
    setSelectedTask(null);
    setComments([]);
    setCommentDraft('');
    setCommentError(null);
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

  const handleAcceptTask = async (taskId) => {
    setUpdatingTaskId(taskId);
    setActionError(null);
    try {
      await acceptTask(taskId);
      await loadMyTasks();
    } catch {
      setActionError('Unable to update task status. Please try again.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleRequestTaskChange = async (taskId) => {
    const reason = window.prompt('Optionally add a reason for this change request:', '');
    if (reason === null) return;

    setUpdatingTaskId(taskId);
    setActionError(null);
    try {
      await requestTaskChange(taskId, { reason: reason.trim() });
      await loadMyTasks();
    } catch {
      setActionError('Unable to request change. Please try again.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    setUpdatingTaskId(taskId);
    setActionError(null);
    try {
      await updateTaskStatus(taskId, status);
      await loadMyTasks();
    } catch {
      setActionError('Unable to update task status. Please try again.');
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
      ) : (
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

                    return (
                      <div
                        key={task.task_id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3"
                      >
                        <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1 min-w-0">
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
                            </div>
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
                                  onClick={() => handleRequestTaskChange(task.task_id)}
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
                              onClick={() => openCommentsModal(task)}
                              disabled={isUpdating}
                            >
                              <MessageSquareWarning className="w-3.5 h-3.5" />
                              View Comments
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
      )}

      <Modal
        isOpen={isCommentsOpen}
        onClose={closeCommentsModal}
        title={selectedTask ? `Comments: ${selectedTask.title}` : 'Task Comments'}
      >
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {comment.full_name || comment.email || 'Team member'}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{comment.comment_text}</p>
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
              placeholder="Add a comment..."
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
      </Modal>
    </div>
  );
}
