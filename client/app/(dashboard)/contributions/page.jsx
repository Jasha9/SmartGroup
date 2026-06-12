'use client';

import { useEffect, useMemo, useState } from 'react';
import { getGroups, getGroupAssessments, getGroupMembers } from '@/services/groupService';
import { getTasks } from '@/services/taskService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import Progress from '@/components/ui/Progress';

function normalizeStatus(status) {
  return String(status || 'TO_DO').toUpperCase();
}

function safeName(member) {
  return member.full_name || member.email || 'Member';
}

export default function ContributionDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const groupsRes = await getGroups();
        const groups = groupsRes?.data?.groups || groupsRes?.groups || [];

        const built = [];

        for (const group of groups) {
          const groupId = group.group_id || group.id;
          const groupName = group.group_name || group.name || 'Unknown Group';

          const [membersRes, assessmentsRes, tasksRes] = await Promise.all([
            getGroupMembers(groupId),
            getGroupAssessments(groupId),
            getTasks(groupId),
          ]);

          const members = membersRes?.data?.members || membersRes?.members || [];
          const assessments = assessmentsRes?.data?.assessments || assessmentsRes?.assessments || [];
          const tasks = tasksRes?.data?.tasks || tasksRes?.tasks || [];

          assessments.forEach((assessment) => {
            const assessmentId = assessment.assessment_id;
            const assessmentTasks = tasks.filter((task) => task.assessment_id === assessmentId);

            const memberRows = members.map((member) => {
              const assigned = assessmentTasks.filter(
                (task) =>
                  task.assigned_to_email === member.email ||
                  task.assigned_to_name === member.full_name ||
                  task.assigned_to_user_id === member.user_id
              );

              const todo = assigned.filter((task) => normalizeStatus(task.status) === 'TO_DO').length;
              const inProgress = assigned.filter((task) => normalizeStatus(task.status) === 'IN_PROGRESS').length;
              const done = assigned.filter((task) => normalizeStatus(task.status) === 'DONE').length;
              const total = todo + inProgress + done;
              const completion = total > 0 ? Math.round((done / total) * 100) : 0;

              return {
                user_id: member.user_id,
                name: safeName(member),
                todo,
                inProgress,
                done,
                total,
                completion,
              };
            });

            const totals = {
              todo: assessmentTasks.filter((task) => normalizeStatus(task.status) === 'TO_DO').length,
              inProgress: assessmentTasks.filter((task) => normalizeStatus(task.status) === 'IN_PROGRESS').length,
              done: assessmentTasks.filter((task) => normalizeStatus(task.status) === 'DONE').length,
            };

            built.push({
              groupId,
              groupName,
              assessmentId,
              assessmentTitle: assessment.title || 'Untitled Assessment',
              dueDate: assessment.due_date,
              memberRows: memberRows.filter((row) => row.total > 0),
              totals,
            });
          });
        }

        setSections(built);
      } catch {
        setError('Failed to load team progress. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const overall = useMemo(() => {
    const totals = sections.reduce(
      (acc, section) => {
        acc.todo += section.totals.todo;
        acc.inProgress += section.totals.inProgress;
        acc.done += section.totals.done;
        return acc;
      },
      { todo: 0, inProgress: 0, done: 0 }
    );

    const total = totals.todo + totals.inProgress + totals.done;
    const completion = total > 0 ? Math.round((totals.done / total) * 100) : 0;
    return { ...totals, total, completion };
  }, [sections]);

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">To Do</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{overall.todo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{overall.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Done</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{overall.done}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Completion</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{overall.completion}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>Completion across all groups and assessments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={overall.completion} variant="teal" />
          <div className="h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
            <div className="bg-slate-400" style={{ width: `${overall.total > 0 ? (overall.todo / overall.total) * 100 : 0}%` }} />
            <div className="bg-teal-500" style={{ width: `${overall.total > 0 ? (overall.inProgress / overall.total) * 100 : 0}%` }} />
            <div className="bg-emerald-500" style={{ width: `${overall.total > 0 ? (overall.done / overall.total) * 100 : 0}%` }} />
          </div>
        </CardContent>
      </Card>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-slate-500 dark:text-slate-400">
            No assessment progress data yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const total = section.totals.todo + section.totals.inProgress + section.totals.done;
            const completion = total > 0 ? Math.round((section.totals.done / total) * 100) : 0;
            return (
              <Card key={`${section.groupId}-${section.assessmentId}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{section.assessmentTitle}</CardTitle>
                      <CardDescription>{section.groupName}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">To Do {section.totals.todo}</Badge>
                      <Badge variant="blue">In Progress {section.totals.inProgress}</Badge>
                      <Badge variant="accepted">Done {section.totals.done}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2 text-slate-500 dark:text-slate-400">
                      <span>Assessment completion</span>
                      <span>{completion}%</span>
                    </div>
                    <Progress value={completion} variant="teal" />
                  </div>

                  {section.memberRows.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No assigned members for this assessment.</p>
                  ) : (
                    <div className="space-y-2">
                      {section.memberRows.map((member) => (
                        <div key={`${section.assessmentId}-${member.user_id}`} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.name}</p>
                            <Badge variant="default">{member.completion}%</Badge>
                          </div>
                          <div className="h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
                            <div className="bg-slate-400" style={{ width: `${member.total > 0 ? (member.todo / member.total) * 100 : 0}%` }} />
                            <div className="bg-teal-500" style={{ width: `${member.total > 0 ? (member.inProgress / member.total) * 100 : 0}%` }} />
                            <div className="bg-emerald-500" style={{ width: `${member.total > 0 ? (member.done / member.total) * 100 : 0}%` }} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>To Do: {member.todo}</span>
                            <span>In Progress: {member.inProgress}</span>
                            <span>Done: {member.done}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
