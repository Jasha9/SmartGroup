'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGroups, getGroupAssessments, getGroupMembers } from '@/services/groupService';
import { getTasks } from '@/services/taskService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import Progress from '@/components/ui/Progress';
import { subscribeDataSync } from '@/lib/dataSync';
import TeamProgressPieChart from '@/components/charts/TeamProgressPieChart';

function normalizeStatus(status) {
  return String(status || 'TO_DO').toUpperCase();
}

function safeName(member) {
  return member.full_name || member.email || 'Member';
}

export default function ContributionDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  const loadGroups = useCallback(async () => {
    const groupsRes = await getGroups();
    return groupsRes?.data?.groups || groupsRes?.groups || [];
  }, []);

  const loadGroupContext = useCallback(async (groupId) => {
    const [membersRes, assessmentsRes] = await Promise.all([
      getGroupMembers(groupId),
      getGroupAssessments(groupId),
    ]);

    const nextMembers = membersRes?.data?.members || membersRes?.members || [];
    const nextAssessments = assessmentsRes?.data?.assessments || assessmentsRes?.assessments || [];

    setMembers(nextMembers);
    setAssessments(nextAssessments);

    return nextAssessments;
  }, []);

  const loadTasks = useCallback(async (groupId, assessmentId) => {
    const tasksRes = await getTasks(groupId, assessmentId || undefined, { includeAcceptedOnly: false });
    const fetched = tasksRes?.data?.tasks || tasksRes?.tasks || [];
    setTasks(fetched);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const nextGroups = await loadGroups();
      setGroups(nextGroups);

      if (nextGroups.length === 0) {
        setSelectedGroupId('');
        setSelectedAssessmentId('');
        setAssessments([]);
        setMembers([]);
        setTasks([]);
        return;
      }

      const currentGroupStillExists = nextGroups.some((g) => String(g.group_id || g.id) === String(selectedGroupId));
      const nextGroupId = currentGroupStillExists
        ? selectedGroupId
        : String(nextGroups[0].group_id || nextGroups[0].id || '');

      setSelectedGroupId(nextGroupId);

      const nextAssessments = await loadGroupContext(nextGroupId);
      const currentAssessmentStillExists = nextAssessments.some((a) => String(a.assessment_id) === String(selectedAssessmentId));
      const nextAssessmentId = currentAssessmentStillExists
        ? selectedAssessmentId
        : String(nextAssessments[0]?.assessment_id || '');

      setSelectedAssessmentId(nextAssessmentId);
      await loadTasks(nextGroupId, nextAssessmentId);
    } catch {
      setError('Failed to load team progress. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loadGroups, loadGroupContext, loadTasks, selectedAssessmentId, selectedGroupId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedGroupId) return;

    async function refreshGroupContext() {
      try {
        setError(null);
        const nextAssessments = await loadGroupContext(selectedGroupId);
        const stillExists = nextAssessments.some((a) => String(a.assessment_id) === String(selectedAssessmentId));
        const resolvedAssessmentId = stillExists ? selectedAssessmentId : String(nextAssessments[0]?.assessment_id || '');
        setSelectedAssessmentId(resolvedAssessmentId);
        await loadTasks(selectedGroupId, resolvedAssessmentId);
      } catch {
        setError('Failed to load team progress. Please try again.');
      }
    }

    refreshGroupContext();
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;

    async function refreshTasksOnly() {
      try {
        setError(null);
        await loadTasks(selectedGroupId, selectedAssessmentId);
      } catch {
        setError('Failed to load team progress. Please try again.');
      }
    }

    refreshTasksOnly();
  }, [selectedAssessmentId]);

  useEffect(() => {
    const unsubscribe = subscribeDataSync(() => {
      loadAll();
    });

    const onFocus = () => {
      loadAll();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [loadAll]);

  const selectedGroupName = useMemo(() => {
    const match = groups.find((g) => String(g.group_id || g.id) === String(selectedGroupId));
    return match?.group_name || match?.name || 'Unknown Group';
  }, [groups, selectedGroupId]);

  const selectedAssessment = useMemo(() => {
    return assessments.find((a) => String(a.assessment_id) === String(selectedAssessmentId)) || null;
  }, [assessments, selectedAssessmentId]);

  const statusCounts = useMemo(() => {
    const counts = {
      Done: 0,
      'In Progress': 0,
      'To Do': 0,
      Pending: 0,
      'Change Requested': 0,
    };

    tasks.forEach((task) => {
      const status = normalizeStatus(task.status);
      if (status === 'DONE') counts.Done += 1;
      else if (status === 'IN_PROGRESS') counts['In Progress'] += 1;
      else if (status === 'TO_DO') counts['To Do'] += 1;
      else if (status === 'PENDING_ACCEPTANCE') counts.Pending += 1;
      else if (status === 'NEGOTIATING' || status === 'CHANGE_REQUESTED') counts['Change Requested'] += 1;
    });

    return counts;
  }, [tasks]);

  const chartData = useMemo(() => {
    return [
      { name: 'Done', value: statusCounts.Done },
      { name: 'In Progress', value: statusCounts['In Progress'] },
      { name: 'To Do', value: statusCounts['To Do'] },
      { name: 'Pending', value: statusCounts.Pending },
      { name: 'Change Requested', value: statusCounts['Change Requested'] },
    ];
  }, [statusCounts]);

  const memberRows = useMemo(() => {
    return members
      .map((member) => {
        const assigned = tasks.filter(
          (task) =>
            task.assigned_to_email === member.email ||
            task.assigned_to_name === member.full_name ||
            task.assigned_to_user_id === member.user_id
        );

        const done = assigned.filter((task) => normalizeStatus(task.status) === 'DONE').length;
        const inProgress = assigned.filter((task) => normalizeStatus(task.status) === 'IN_PROGRESS').length;
        const todo = assigned.filter((task) => normalizeStatus(task.status) === 'TO_DO').length;
        const pending = assigned.filter((task) => normalizeStatus(task.status) === 'PENDING_ACCEPTANCE').length;
        const changeRequested = assigned.filter((task) => {
          const status = normalizeStatus(task.status);
          return status === 'NEGOTIATING' || status === 'CHANGE_REQUESTED';
        }).length;
        const total = assigned.length;
        const completion = total > 0 ? Math.round((done / total) * 100) : 0;

        return {
          user_id: member.user_id,
          name: safeName(member),
          done,
          inProgress,
          todo,
          pending,
          changeRequested,
          total,
          completion,
        };
      })
      .filter((row) => row.total > 0);
  }, [members, tasks]);

  const totalTasks = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);
  const completion = totalTasks > 0 ? Math.round((statusCounts.Done / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading team progress..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <p className="sg-eyebrow">Team Insights</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Progress</h2>
        <p className="text-slate-500 dark:text-slate-400">Grouped by Group → Assessment → Member progress.</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Progress Filters</CardTitle>
          <CardDescription>Select a group and assessment to view real task distribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Group
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
              >
                {groups.length === 0 ? (
                  <option value="">No groups available</option>
                ) : (
                  groups.map((group) => {
                    const id = String(group.group_id || group.id);
                    const name = group.group_name || group.name || 'Unknown Group';
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Assessment
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                value={selectedAssessmentId}
                onChange={(event) => setSelectedAssessmentId(event.target.value)}
                disabled={assessments.length === 0}
              >
                {assessments.length === 0 ? (
                  <option value="">No assessments available</option>
                ) : (
                  assessments.map((assessment) => (
                    <option key={assessment.assessment_id} value={assessment.assessment_id}>
                      {assessment.title || 'Untitled Assessment'}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">To Do</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCounts['To Do']}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCounts['In Progress']}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Done</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCounts.Done}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Completion</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{completion}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Progress Overview</CardTitle>
          <CardDescription>Task status distribution for the selected assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {selectedGroupName} {selectedAssessment ? `· ${selectedAssessment.title || 'Untitled Assessment'}` : ''}
            </p>
            <Badge variant="default">{totalTasks} tasks</Badge>
          </div>
          <TeamProgressPieChart data={chartData} />
        </CardContent>
      </Card>

      {totalTasks === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-slate-500 dark:text-slate-400">
            No task progress available yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Member Progress</CardTitle>
            <CardDescription>Contribution split for selected group and assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberRows.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No assigned members for this assessment.</p>
            ) : (
              memberRows.map((member) => (
                <div key={`member-${member.user_id}`} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.name}</p>
                    <Badge variant="default">{member.completion}%</Badge>
                  </div>

                  <Progress value={member.completion} variant="teal" />

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Done: {member.done}</span>
                    <span>In Progress: {member.inProgress}</span>
                    <span>To Do: {member.todo}</span>
                    <span>Pending: {member.pending}</span>
                    <span>Change Requested: {member.changeRequested}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
