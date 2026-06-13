'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateTasks, saveAssignedTasks } from '@/services/aiService';
import { getGroups, getGroupMembers } from '@/services/groupService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { AlertCircle, CheckCircle2, Sparkles, Upload, Users } from 'lucide-react';

const STEPS = [
  'Select Team',
  'Project Details',
  'Upload Brief',
  'Generate AI Plan',
  'Review Plan',
  'Assign Tasks',
  'Publish Plan',
];

const PROCESS_STEPS = [
  'Reading assessment brief',
  'Extracting requirements',
  'Identifying milestones',
  'Generating tasks',
  'Estimating workload',
  'Preparing assignment plan',
];

const MAX_WORKLOAD_VARIANCE_HOURS = 2;

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateSuggestedDueDate(baseDueDate, index, totalTasks) {
  if (!baseDueDate) return '';
  const dueDate = new Date(baseDueDate);
  const leadDays = Math.max(1, Math.ceil(((totalTasks - index) / totalTasks) * 7));
  dueDate.setDate(dueDate.getDate() - leadDays);
  return formatDate(dueDate.toISOString());
}

export default function AIPlannerPage() {
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState('upload');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDueDate, setAssessmentDueDate] = useState('');
  const [promptText, setPromptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assistantNote, setAssistantNote] = useState('Start by selecting a team to plan with.');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        const list = data?.data?.groups || data?.groups || (Array.isArray(data) ? data : []);
        setGroups(list);
        if (list.length > 0) {
          setSelectedGroupId(String(list[0].group_id || list[0].id || ''));
        }
      } catch {
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const data = await getGroupMembers(selectedGroupId);
        setMembers(data?.data?.members || data?.data || []);
      } catch {
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
  }, [selectedGroupId]);

  const hasTeams = !groupsLoading && groups.length > 0;
  const canGenerate = selectedGroupId && assessmentTitle.trim().length > 0 && (inputMode === 'upload' ? !!uploadedFile : promptText.trim().length > 0);
  const canPublish = generatedTasks.length > 0 && generatedTasks.every((task) => task.assigned_to_email);

  const workloadSummary = useMemo(() => {
    if (!members.length) return null;

    const totals = new Map(
      members.map((member) => [String(member.email || '').trim().toLowerCase(), {
        email: String(member.email || '').trim().toLowerCase(),
        name: member.full_name || member.email,
        totalHours: 0,
        taskCount: 0,
      }])
    );

    for (const task of generatedTasks) {
      const email = String(task.assigned_to_email || '').trim().toLowerCase();
      if (!email || !totals.has(email)) continue;
      const hours = Math.max(1, Math.min(8, Number(task.estimated_hours) || 1));
      const row = totals.get(email);
      row.totalHours += hours;
      row.taskCount += 1;
    }

    const rows = Array.from(totals.values());
    const hourValues = rows.map((row) => row.totalHours);
    const maxHours = hourValues.length ? Math.max(...hourValues) : 0;
    const minHours = hourValues.length ? Math.min(...hourValues) : 0;
    const varianceHours = maxHours - minHours;

    return {
      rows,
      maxHours,
      minHours,
      varianceHours,
      limitHours: MAX_WORKLOAD_VARIANCE_HOURS,
      isBalanced: varianceHours <= MAX_WORKLOAD_VARIANCE_HOURS,
    };
  }, [generatedTasks, members]);

  const canPublishBalanced = Boolean(canPublish && workloadSummary?.isBalanced);

  const completionPct = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);

  const planSummary = useMemo(() => {
    if (generatedTasks.length === 0) return null;
    const taskCount = generatedTasks.length;
    const totalHours = generatedTasks.reduce((sum, task) => sum + (task.estimated_hours || 1), 0);
    const riskLevel = generatedTasks.some((task) => task.priority === 'HIGH') ? 'Elevated' : 'Balanced';
    const milestones = generatedTasks.slice(0, 3).map((task) => task.title || 'Milestone');
    const recommendations = [];
    if (riskLevel === 'Elevated') {
      recommendations.push('Focus first on high-priority tasks to reduce risk.');
    }
    if (generatedTasks.some((task) => !task.assigned_to_email)) {
      recommendations.push('Assign every task to keep accountability on track.');
    } else {
      recommendations.push('Your plan is ready to publish to the team.');
    }

    return {
      taskCount,
      totalHours,
      riskLevel,
      milestones,
      recommendations,
    };
  }, [generatedTasks]);

  const handleFileUpload = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setUploadedFile(file);
    setError('');
    setAssistantNote(`Uploaded ${file.name}. Ready to generate your AI plan.`);
    if (step < 3) setStep(3);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFileUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFileUpload(file);
  };

  const handleGenerateTasks = async () => {
    if (!hasTeams) {
      setError('No teams available. Create a team in Team Space before using SmartGroup Assistant.');
      return;
    }

    if (!canGenerate) {
      setError('Complete the project details and upload your assessment brief before generating a plan.');
      return;
    }

    setLoading(true);
    setError('');
    setSaveSuccess(false);
    setStep(4);
    setAssistantNote(`Generating a balanced AI plan for ${Math.max(members.length, 1)} team member${Math.max(members.length, 1) === 1 ? '' : 's'}. This may take a moment.`);
    setProcessingIndex(0);

    const interval = setInterval(() => {
      setProcessingIndex((current) => Math.min(current + 1, PROCESS_STEPS.length));
    }, 550);

    try {
      const data = await generateTasks({
        groupId: selectedGroupId,
        assignmentText: inputMode === 'text' ? promptText : '',
        assignmentFile: inputMode === 'upload' ? uploadedFile : null,
      });
      const rawTasks = data?.data?.tasks || [];
      const plannedMemberCount = Math.max(Number(data?.data?.memberCount || members.length || 1), 1);
      setQuotaInfo(data?.data?.usage || null);
      const normalized = rawTasks.map((task, index) => ({
        id: index,
        title: task.title || `Task ${index + 1}`,
        description: task.description || '',
        priority: task.priority || 'MEDIUM',
        estimated_hours: task.estimated_hours || 2,
        suggested_due_date: calculateSuggestedDueDate(assessmentDueDate, index, rawTasks.length),
        status: 'TO_DO',
        assigned_to_email: '',
      }));

      setGeneratedTasks(normalized);
      setStep(5);
  setAssistantNote(`AI plan ready for ${plannedMemberCount} team member${plannedMemberCount === 1 ? '' : 's'}. Review the summary and make sure the workload looks balanced before assignment.`);
    } catch (err) {
      const usage = err?.response?.data?.data?.usage || null;
      setQuotaInfo(usage);
      setError(err.message || 'Failed to generate tasks. Please try again.');
      setAssistantNote('AI planning failed. Adjust your brief or try again.');
    } finally {
      clearInterval(interval);
      setProcessingIndex(PROCESS_STEPS.length);
      setLoading(false);
    }
  };

  const updateTaskTitle = (id, title) => {
    setGeneratedTasks((prev) => prev.map((task) => (task.id === id ? { ...task, title } : task)));
  };

  const updateTaskDescription = (id, description) => {
    setGeneratedTasks((prev) => prev.map((task) => (task.id === id ? { ...task, description } : task)));
  };

  const updateTaskPriority = (id, priority) => {
    setGeneratedTasks((prev) => prev.map((task) => (task.id === id ? { ...task, priority } : task)));
  };

  const updateTaskEstimatedHours = (id, estimatedHours) => {
    const normalizedHours = Math.max(1, Math.min(8, Number(estimatedHours) || 1));
    setGeneratedTasks((prev) => prev.map((task) => (task.id === id ? { ...task, estimated_hours: normalizedHours } : task)));
  };

  const assignTask = (id, assigned_to_email) => {
    setGeneratedTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, assigned_to_email } : task))
    );
  };

  const handleAutoAssignEvenly = () => {
    if (!members.length || !generatedTasks.length) {
      setError('Load team members and generate tasks before auto-assigning.');
      return;
    }

    const assignees = members
      .map((member) => ({
        email: String(member.email || '').trim().toLowerCase(),
        totalHours: 0,
        taskCount: 0,
      }))
      .filter((member) => member.email);

    if (!assignees.length) {
      setError('No valid team member emails found for auto-assignment.');
      return;
    }

    const sortedTasks = [...generatedTasks]
      .map((task, originalIndex) => ({ task, originalIndex }))
      .sort((a, b) => (Number(b.task.estimated_hours) || 1) - (Number(a.task.estimated_hours) || 1));

    const next = [...generatedTasks];
    for (const { task, originalIndex } of sortedTasks) {
      assignees.sort((a, b) => {
        if (a.totalHours !== b.totalHours) return a.totalHours - b.totalHours;
        return a.taskCount - b.taskCount;
      });

      const selected = assignees[0];
      const hours = Math.max(1, Math.min(8, Number(task.estimated_hours) || 1));

      next[originalIndex] = {
        ...next[originalIndex],
        assigned_to_email: selected.email,
      };

      selected.totalHours += hours;
      selected.taskCount += 1;
    }

    setGeneratedTasks(next);
    setError('');
    setAssistantNote('Tasks auto-assigned for balanced workload. Review and adjust if needed.');
  };

  const handleConfirmReview = () => {
    if (!generatedTasks.length) {
      setError('Generate an AI plan before reviewing it.');
      return;
    }
    setError('');
    setStep(6);
    setAssistantNote('Assign tasks to the selected team members.');
  };

  const handlePublishPlan = async () => {
    if (!selectedGroupId) {
      setError('Select a team before publishing your project plan.');
      return;
    }

    if (!canPublish) {
      setError('Assign every task to a team member before publishing.');
      return;
    }

    if (!workloadSummary?.isBalanced) {
      setError(`Workload is unbalanced. Keep the difference to ${MAX_WORKLOAD_VARIANCE_HOURS}h or less before publishing.`);
      return;
    }

    setSaving(true);
    setError('');
    setAssistantNote('Publishing the plan and assigning responsibilities.');

    try {
      await saveAssignedTasks(selectedGroupId, generatedTasks, {
        assessmentTitle: assessmentTitle.trim(),
        assessmentDescription: inputMode === 'upload' ? `Uploaded document ${uploadedFile?.name}` : promptText.trim(),
        assessmentDueDate: assessmentDueDate || null,
      });
      setStep(7);
      setSaveSuccess(true);
      setAssistantNote('Project plan published. Your team can now view tasks in My Tasks and Responsibilities.');
      setGeneratedTasks([]);
    } catch (err) {
      setError(err.message || 'Failed to publish project plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="sg-eyebrow">SmartGroup Assistant</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">AI Project Planning</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Create a delivery-ready plan for your group assignment.</p>
            </div>
            <Badge variant="blue">Step {step} / {STEPS.length}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
            {STEPS.map((label, idx) => {
              const stepIndex = idx + 1;
              const active = stepIndex <= step;
              return (
                <div
                  key={label}
                  className={`rounded-2xl px-3 py-2 text-xs font-medium border ${
                    active
                      ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800'
                      : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {stepIndex}. {label}
                </div>
              );
            })}
          </div>

          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-500" style={{ width: `${completionPct}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-slate-700 dark:text-slate-300">{assistantNote}</p>
              {quotaInfo && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AI generations used: {quotaInfo.generationCount} / {quotaInfo.limit}
                  {quotaInfo.resetAt ? ` • resets ${formatDate(quotaInfo.resetAt)}` : ''}
                </p>
              )}
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 dark:text-emerald-300">Project plan published successfully. Tasks are now available in My Tasks and the Responsibilities page.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Existing Team</CardTitle>
          <CardDescription>Choose one of the teams you already belong to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!groupsLoading && groups.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 text-center">
              <p className="text-base font-medium text-slate-900 dark:text-slate-100">No teams available.</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create a team in Team Space before using SmartGroup Assistant.</p>
              <div className="mt-4 flex justify-center">
                <Link href="/workspace">
                  <Button variant="outline">Go to Team Space</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setGeneratedTasks([]);
                  setSaveSuccess(false);
                  setStep(1);
                  setAssistantNote('Team selected. Continue with project details.');
                }}
                disabled={groupsLoading}
                className="w-full max-w-xl px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              >
                {groupsLoading && <option>Loading teams...</option>}
                {!groupsLoading && groups.length === 0 && <option value="">No teams available</option>}
                {groups.map((group) => (
                  <option key={group.group_id || group.id} value={group.group_id || group.id}>
                    {group.group_name || group.name}
                  </option>
                ))}
              </select>
              {!!selectedGroupId && !membersLoading && members.length > 0 && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {members.length} members available for task assignment
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Project Details</CardTitle>
          <CardDescription>Project details help SmartGroup estimate workload, deadlines, and project risk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Project title</label>
              <input
                value={assessmentTitle}
                onChange={(e) => {
                  setAssessmentTitle(e.target.value);
                  if (step < 2) setStep(2);
                }}
                placeholder="e.g. Capstone Final Report"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date</label>
              <input
                type="date"
                value={assessmentDueDate}
                onChange={(e) => {
                  setAssessmentDueDate(e.target.value);
                  if (step < 2) setStep(2);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 3: Upload Assessment Brief</CardTitle>
          <CardDescription>Upload your PDF brief so SmartGroup can generate an accurate plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-8 transition ${
              isDragging
                ? 'border-teal-400 bg-teal-50/40 dark:border-teal-600 dark:bg-teal-900/20'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'
            }`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <Upload className="w-10 h-10 text-slate-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Drag and drop your PDF brief here</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">or click to select a file</p>
              </div>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" onChange={handleFileChange} />
              {uploadedFile && (
                <div className="mt-4 rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p>{uploadedFile.size > 0 ? `${Math.round(uploadedFile.size / 1024)} KB` : ''}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            If you prefer not to upload a file, switch to text entry below.
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setInputMode('text');
                  if (step < 3) setStep(3);
                }}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium transition ${
                  inputMode === 'text'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Paste text instead
              </button>
            </div>
            {inputMode === 'text' && (
              <textarea
                rows={6}
                value={promptText}
                onChange={(e) => {
                  setPromptText(e.target.value);
                  if (step < 3) setStep(3);
                }}
                placeholder="Paste the assignment brief here..."
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-400"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 4: Generate AI Plan</CardTitle>
          <CardDescription>SmartGroup will build milestones, tasks, and effort estimates automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateTasks} disabled={!canGenerate || loading || !hasTeams} className="w-full" variant="teal">
            {loading ? 'Generating AI Plan...' : 'Generate AI Plan'}
          </Button>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">AI processing experience</p>
            <div className="mt-4 space-y-3">
              {PROCESS_STEPS.map((label, index) => {
                const completed = loading ? index < processingIndex : step > 4;
                const active = loading && index === processingIndex - 1;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className={`grid h-8 w-8 place-items-center rounded-full border ${
                      completed
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-slate-300 text-slate-400 dark:border-slate-700'
                    }`}>
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {label}
                      </p>
                      {active && <p className="text-xs text-teal-600 dark:text-teal-400">Working...</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {planSummary && step >= 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Review AI Generated Plan</CardTitle>
            <CardDescription>Validate the plan summary before assigning tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Project summary</p>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{assessmentTitle || 'Untitled project'}</p>
                {assessmentDueDate && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Deadline: {formatDate(assessmentDueDate)}</p>}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Estimated duration</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{Math.max(1, Math.ceil(planSummary.totalHours / 8))} weeks</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tasks generated</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{planSummary.taskCount}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk level</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{planSummary.riskLevel}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Key milestones</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {planSummary.milestones.map((milestone, index) => (
                    <li key={index} className="rounded-2xl bg-white p-3 dark:bg-slate-900">{milestone}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AI recommendations</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {planSummary.recommendations.map((note, index) => (
                    <li key={index} className="rounded-2xl bg-white p-3 dark:bg-slate-900">{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Generated tasks</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Review the exact tasks SmartGroup generated before moving to assignment.</p>
              </div>
              <div className="grid gap-3">
                {generatedTasks.map((task) => (
                  <div key={task.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                      <div className="space-y-3 min-w-0">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Task title</label>
                          <input
                            value={task.title}
                            onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</label>
                          <textarea
                            rows={3}
                            value={task.description}
                            onChange={(e) => updateTaskDescription(task.id, e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Priority</label>
                          <select
                            value={task.priority}
                            onChange={(e) => updateTaskPriority(task.id, e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Effort hours</label>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            value={task.estimated_hours}
                            onChange={(e) => updateTaskEstimatedHours(task.id, e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant={task.priority === 'HIGH' ? 'destructive' : task.priority === 'LOW' ? 'default' : 'warning'}>
                            {task.priority}
                          </Badge>
                          <Badge variant="blue">{task.estimated_hours}h</Badge>
                          {task.suggested_due_date && <Badge variant="outline">Due {task.suggested_due_date}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleConfirmReview} variant="outline">Proceed to Assign Tasks</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedTasks.length > 0 && step >= 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6: Assign Tasks</CardTitle>
            <CardDescription>Assign each AI-generated task to a team member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Balanced assignment helper</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Auto-assign tasks to distribute workload as evenly as possible.</p>
              </div>
              <Button variant="outline" onClick={handleAutoAssignEvenly} disabled={saving || membersLoading || members.length === 0}>
                Auto-Assign Equally
              </Button>
            </div>

            {workloadSummary && (
              <div className={`rounded-2xl border p-3 ${workloadSummary.isBalanced ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'}`}>
                <p className={`text-sm font-medium ${workloadSummary.isBalanced ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
                  Workload variance: {workloadSummary.varianceHours}h (limit {workloadSummary.limitHours}h)
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {workloadSummary.rows.map((row) => (
                    <div key={row.email} className="rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                      <p className="font-medium truncate">{row.name}</p>
                      <p>{row.taskCount} task{row.taskCount === 1 ? '' : 's'} • {row.totalHours}h</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-1/4">Task</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Priority</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-28">Effort</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-36">Due Date</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-72">Assign To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {generatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{task.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{task.description}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge variant={task.priority === 'HIGH' ? 'destructive' : task.priority === 'LOW' ? 'default' : 'warning'}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task.estimated_hours}h</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task.suggested_due_date || 'TBD'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={task.assigned_to_email}
                        onChange={(e) => assignTask(task.id, e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          task.assigned_to_email ? 'border-slate-200 dark:border-slate-700' : 'border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        <option value="">Select team member</option>
                        {membersLoading && <option disabled>Loading members...</option>}
                        {members.map((member) => (
                          <option key={member.user_id} value={member.email}>
                            {member.full_name || member.email}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Once all tasks are assigned and workload is balanced, publish the plan to make it available in My Tasks.
            </div>
            <Button onClick={handlePublishPlan} disabled={saving || !canPublishBalanced} variant="teal">
              {saving ? 'Publishing plan...' : 'Publish Plan'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
