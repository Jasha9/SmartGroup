'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getGroups,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  getGroupAssessments,
  getGroupMessages,
  sendGroupMessage,
} from '@/services/groupService';
import { getTasks } from '@/services/taskService';
import { markNotificationsReadByContext } from '@/services/notificationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import Progress from '@/components/ui/Progress';
import CreateGroupButton from '@/components/workspace/CreateGroupButton';
import CreateGroupModal from '@/components/workspace/CreateGroupModal';
import { Activity, MessageCircle, Users } from 'lucide-react';

const TABS = ['OVERVIEW', 'MEMBERS', 'ASSESSMENTS', 'GROUP_CHAT'];

function normalizeStatus(status) {
  return String(status || 'TO_DO').toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'No due date';
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Unknown time';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown time';
  return d.toLocaleString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const BOARD_STATUSES = ['TO_DO', 'IN_PROGRESS', 'DONE'];

function extractMentionTokens(text) {
  const matches = String(text || '').matchAll(/@([a-zA-Z0-9._%+-]+(?:\s+[a-zA-Z0-9._%+-]+)*)/g);
  return Array.from(matches).map((m) => String(m[1] || '').trim()).filter(Boolean);
}

function getMentionQuery(text) {
  const match = String(text || '').match(/(?:^|\s)@([^\s@]*)$/);
  return match ? String(match[1] || '').toLowerCase() : null;
}

function applyMention(text, label) {
  return String(text || '').replace(/(?:^|\s)@([^\s@]*)$/, (full) => {
    const prefix = full.startsWith(' ') ? ' ' : '';
    return `${prefix}@${label} `;
  });
}

export default function GroupWorkspacePage() {
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  const [groupMembers, setGroupMembers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [error, setError] = useState('');
  const [memberActionError, setMemberActionError] = useState('');
  const [messageError, setMessageError] = useState('');

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalGroup, setGroupModalGroup] = useState(null);

  const selectedGroupId = selectedGroup?.group_id || selectedGroup?.id;

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

  const fetchMembers = useCallback(async (groupId) => {
    if (!groupId) return setGroupMembers([]);
    setLoadingMembers(true);
    try {
      const data = await getGroupMembers(groupId);
      setGroupMembers(data?.data?.members || data?.members || []);
    } catch {
      setGroupMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const fetchAssessments = useCallback(async (groupId) => {
    if (!groupId) return setAssessments([]);
    setLoadingAssessments(true);
    try {
      const data = await getGroupAssessments(groupId);
      setAssessments(data?.data?.assessments || data?.assessments || []);
    } catch {
      setAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  }, []);

  const fetchTasks = useCallback(async (groupId) => {
    if (!groupId) return setTasks([]);
    setLoadingTasks(true);
    try {
      const data = await getTasks(groupId);
      setTasks(data?.data?.tasks || data?.tasks || []);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchMessages = useCallback(async (groupId) => {
    if (!groupId) return setGroupMessages([]);
    setLoadingMessages(true);
    setMessageError('');
    try {
      const data = await getGroupMessages(groupId);
      setGroupMessages(data?.data?.messages || data?.messages || []);
    } catch {
      setGroupMessages([]);
      setMessageError('Unable to load group chat.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const list = await refreshGroups();
      setSelectedGroup((current) => {
        if (!list.length) return null;
        if (!current) return list[0];
        return list.find((g) => (g.group_id || g.id) === (current.group_id || current.id)) || list[0];
      });
      setLoadingGroups(false);
    }
    init();
  }, [refreshGroups]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupMembers([]);
      setAssessments([]);
      setTasks([]);
      setGroupMessages([]);
      return;
    }
    fetchMembers(selectedGroupId);
    fetchAssessments(selectedGroupId);
    fetchTasks(selectedGroupId);
    fetchMessages(selectedGroupId);
  }, [selectedGroupId, fetchMembers, fetchAssessments, fetchTasks, fetchMessages]);

  useEffect(() => {
    if (!selectedGroupId || activeTab !== 'GROUP_CHAT') return;

    // Opening Group Chat counts as reviewing mention alerts from this group.
    markNotificationsReadByContext({ groupId: selectedGroupId, types: ['GROUP_MENTION'] }).catch(() => null);
  }, [selectedGroupId, activeTab]);

  const handleGroupUpdated = useCallback(async () => {
    const list = await refreshGroups();
    const next = list.find((g) => (g.group_id || g.id) === selectedGroupId) || list[0] || null;
    setSelectedGroup(next);
  }, [refreshGroups, selectedGroupId]);

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    const confirmed = window.confirm('Delete this group and all its tasks? This cannot be undone.');
    if (!confirmed) return;
    try {
      setError('');
      await deleteGroup(selectedGroupId);
      const list = await refreshGroups();
      setSelectedGroup(list[0] || null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to delete group.');
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroupId) return;
    const email = newMemberEmail.trim().toLowerCase();
    if (!email) {
      setMemberActionError('Enter an email to add a member.');
      return;
    }
    try {
      setMemberActionLoading(true);
      setMemberActionError('');
      const result = await addGroupMember(selectedGroupId, { email });
      setGroupMembers(result?.data?.members || result?.members || []);
      setNewMemberEmail('');
    } catch (err) {
      setMemberActionError(err?.response?.data?.error || 'Failed to add member.');
    } finally {
      setMemberActionLoading(false);
    }
  };

  const mentionSuggestions = useMemo(() => {
    const q = getMentionQuery(messageDraft);
    if (q === null) return [];
    const candidates = groupMembers.filter((member) => member.user_id !== user?.user_id);
    if (!q) return candidates.slice(0, 6);
    return candidates.filter((member) => {
      const fullName = String(member.full_name || '').toLowerCase();
      const email = String(member.email || '').toLowerCase();
      return fullName.includes(q) || email.includes(q);
    }).slice(0, 6);
  }, [messageDraft, groupMembers, user]);

  const taskSummary = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => normalizeStatus(task.status) === 'DONE').length;
    return { completion: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  const assessmentProgress = useMemo(() => {
    return assessments.map((assessment) => {
      const sectionTasks = tasks.filter((task) => task.assessment_id === assessment.assessment_id);
      const total = sectionTasks.length;
      const done = sectionTasks.filter((task) => normalizeStatus(task.status) === 'DONE').length;
      const inProgress = sectionTasks.filter((task) => normalizeStatus(task.status) === 'IN_PROGRESS').length;
      const todo = sectionTasks.filter((task) => normalizeStatus(task.status) === 'TO_DO').length;
      return {
        assessment,
        done,
        inProgress,
        todo,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  }, [assessments, tasks]);

  const assessmentBoards = useMemo(() => {
    const indexedAssessments = new Map(
      assessments.map((assessment) => [assessment.assessment_id, {
        assessment_id: assessment.assessment_id,
        title: assessment.title,
        due_date: assessment.due_date || null,
        tasks: [],
      }])
    );

    for (const task of tasks) {
      const key = task.assessment_id || 'unassigned';
      if (!indexedAssessments.has(key)) {
        indexedAssessments.set(key, {
          assessment_id: key,
          title: 'Unassigned Assessment',
          due_date: null,
          tasks: [],
        });
      }
      indexedAssessments.get(key).tasks.push(task);
    }

    return Array.from(indexedAssessments.values())
      .filter((section) => section.tasks.length > 0)
      .map((section) => ({
        ...section,
        tasksByStatus: BOARD_STATUSES.reduce((acc, status) => {
          acc[status] = section.tasks.filter((task) => normalizeStatus(task.status) === status);
          return acc;
        }, {}),
      }));
  }, [assessments, tasks]);

  const memberStats = useMemo(() => {
    return groupMembers.map((member) => {
      const assigned = tasks.filter((task) => task.assigned_to_user_id === member.user_id || task.assigned_to_email === member.email || task.assigned_to_name === member.full_name);
      const done = assigned.filter((task) => normalizeStatus(task.status) === 'DONE').length;
      const total = assigned.length;
      return { ...member, done, total, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [groupMembers, tasks]);

  const handleSendMessage = async () => {
    if (!selectedGroupId) return;
    const text = messageDraft.trim();
    if (!text) return;
    try {
      setSendingMessage(true);
      setMessageError('');
      const mentions = extractMentionTokens(text);
      await sendGroupMessage(selectedGroupId, text, mentions);
      setMessageDraft('');
      await fetchMessages(selectedGroupId);
    } catch {
      setMessageError('Unable to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loadingGroups) {
    return <div className="max-w-7xl mx-auto mt-6"><LoadingState message="Loading team space..." /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="sg-eyebrow">Team Collaboration Hub</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">Team Space</h2>
          {selectedGroup && <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedGroup.group_name || selectedGroup.name}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <CreateGroupButton onGroupCreated={handleGroupUpdated} />
          <Button variant="outline" onClick={() => { if (selectedGroup) { setGroupModalGroup(selectedGroup); setIsGroupModalOpen(true); } }} disabled={!selectedGroup}>Edit Group</Button>
          <Button variant="danger" onClick={handleDeleteGroup} disabled={!selectedGroup}>Delete Group</Button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Groups</h3>
          {groups.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No groups yet.</p> : (
            <div className="space-y-2">
              {groups.map((group) => {
                const groupId = group.group_id || group.id;
                const active = groupId === selectedGroupId;
                return (
                  <button key={groupId} type="button" onClick={() => setSelectedGroup(group)} className={`w-full text-left rounded-xl border p-2.5 transition ${active ? 'border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{group.group_name || group.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{group.member_count || 0} members</p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {!selectedGroup ? (
            <Card className="p-10 text-center text-slate-500 dark:text-slate-400">No group selected. Create or select a group to view your team space.</Card>
          ) : (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap gap-2">{TABS.map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{tab.replace('_', ' ')}</button>
                ))}</div>
              </Card>

              {activeTab === 'OVERVIEW' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card><CardContent className="pt-6"><p className="text-xs text-slate-500 dark:text-slate-400">Members</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{groupMembers.length}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-xs text-slate-500 dark:text-slate-400">Assessments</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{assessments.length}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-xs text-slate-500 dark:text-slate-400">Task Completion</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{taskSummary.completion}%</p></CardContent></Card>
                </div>
              )}

              {activeTab === 'MEMBERS' && (
                <Card>
                  <CardHeader><CardTitle>Members</CardTitle><CardDescription>Manage team members and progress.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                      <input value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="student@example.com" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                      <Button onClick={handleAddMember} disabled={memberActionLoading}>{memberActionLoading ? 'Adding...' : 'Add Member'}</Button>
                    </div>
                    {memberActionError && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{memberActionError}</div>}
                    {loadingMembers ? <LoadingState message="Loading members..." /> : (
                      <div className="space-y-2">{memberStats.map((member) => (
                        <div key={member.user_id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                          <div className="flex items-center justify-between mb-2"><p className="font-medium text-slate-900 dark:text-slate-100">{member.full_name || member.email}</p><Badge variant="default">{member.done}/{member.total} done</Badge></div>
                          <Progress value={member.progress} variant="teal" />
                        </div>
                      ))}</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'ASSESSMENTS' && (
                <Card>
                  <CardHeader><CardTitle>Assessments</CardTitle><CardDescription>Assessment-level workload and progress.</CardDescription></CardHeader>
                  <CardContent className="space-y-3">
                    {loadingAssessments || loadingTasks ? <LoadingState message="Loading assessments..." /> : (
                      <>
                        {assessmentProgress.map((item) => (
                          <div key={item.assessment.assessment_id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div><p className="font-medium text-slate-900 dark:text-slate-100">{item.assessment.title}</p><p className="text-xs text-slate-500 dark:text-slate-400">Due {formatDate(item.assessment.due_date)}</p></div>
                              <div className="flex flex-wrap gap-1"><Badge variant="default">To Do {item.todo}</Badge><Badge variant="blue">In Progress {item.inProgress}</Badge><Badge variant="accepted">Done {item.done}</Badge></div>
                            </div>
                            <Progress value={item.progress} variant="teal" />
                          </div>
                        ))}

                        <div className="pt-2 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Task Board By Assessment</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Grouped into To Do, In Progress, and Done</p>
                          </div>

                          {assessmentBoards.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                              No tasks found for this group yet.
                            </div>
                          ) : assessmentBoards.map((board) => (
                            <div key={board.assessment_id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">{board.title}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Due {formatDate(board.due_date)}</p>
                                </div>
                                <Badge variant="outline">{board.tasks.length} tasks</Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {BOARD_STATUSES.map((status) => (
                                  <div key={`${board.assessment_id}-${status}`} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/80 dark:bg-slate-900/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 dark:text-slate-400">{status.replace('_', ' ')}</p>
                                      <Badge variant="default">{board.tasksByStatus[status].length}</Badge>
                                    </div>
                                    <div className="space-y-2">
                                      {board.tasksByStatus[status].length === 0 ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">No tasks</p>
                                      ) : board.tasksByStatus[status].map((task) => (
                                        <div key={task.task_id} className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2">
                                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.assigned_to_name || task.assigned_to_email || 'Unassigned'} • Due {formatDate(task.due_date)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'GROUP_CHAT' && (
                <Card>
                  <CardHeader><CardTitle>Group Chat</CardTitle><CardDescription>Use @mentions to notify teammates.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {loadingMessages ? <LoadingState message="Loading messages..." /> : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">{groupMessages.map((message) => (
                        <div key={message.message_id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                          <div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{message.full_name || message.email}</p><span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateTime(message.created_at)}</span></div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{message.message}</p>
                        </div>
                      ))}</div>
                    )}
                    {messageError && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{messageError}</div>}
                    <div className="relative">
                      <textarea rows={3} value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Write a message... Use @ to mention teammates" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                      {mentionSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 z-10 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                          {mentionSuggestions.map((member) => (
                            <button key={member.user_id} type="button" onClick={() => setMessageDraft((value) => applyMention(value, member.full_name || member.email))} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">{member.full_name || member.email}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end"><Button onClick={handleSendMessage} disabled={sendingMessage || !messageDraft.trim()}>{sendingMessage ? 'Sending...' : 'Send'}</Button></div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <CreateGroupModal isOpen={isGroupModalOpen} onClose={(groupData) => { setIsGroupModalOpen(false); setGroupModalGroup(null); if (groupData) handleGroupUpdated(); }} group={groupModalGroup} />
    </div>
  );
}
