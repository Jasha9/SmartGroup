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
  const [planOutput, setPlanOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assistantNote, setAssistantNote] = useState('Start by selecting a team to plan with.');
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const completionPct = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);

  const planSummary = useMemo(() => {
    if (!planOutput || generatedTasks.length === 0) return null;

    const taskCount = generatedTasks.length;
    const totalHours = generatedTasks.reduce((sum, task) => sum + (task.estimated_hours || 1), 0);
    const riskLevel = planOutput.fairnessScore !== undefined ? (planOutput.fairnessScore < 85 ? 'Elevated' : 'Balanced') : generatedTasks.some((task) => task.priority === 'HIGH') ? 'Elevated' : 'Balanced';
    const milestones = planOutput.milestones?.length > 0 ? planOutput.milestones.map((milestone) => milestone.title) : generatedTasks.slice(0, 3).map((task) => task.title || 'Milestone');
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
      fairnessScore: planOutput.fairnessScore,
      deliverables: planOutput.deliverables || [],
      teamSize: planOutput.workloadSummary?.teamSize || members.length,
      targetHoursPerMember: planOutput.workloadSummary?.targetHoursPerMember || Math.round((totalHours / Math.max(1, members.length)) * 10) / 10,
    };
  }, [generatedTasks, planOutput, members.length]);

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
    setPlanOutput(null);
    setStep(4);
    setAssistantNote('Generating your AI plan. This may take a moment.');
    setProcessingIndex(0);

    const interval = setInterval(() => {
      setProcessingIndex((current) => Math.min(current + 1, PROCESS_STEPS.length));
    }, 550);

    try {
      const assignmentText = inputMode === 'upload' ? `Assessment document: ${uploadedFile?.name}` : promptText;
      const data = await generateTasks({
        assignmentText,
        groupSize: members.length,
        assessmentTitle: assessmentTitle.trim(),
        assessmentDueDate,
      });
      const plan = data?.data || {};
      const rawTasks = plan.tasks || [];
      const normalized = rawTasks.map((task, index) => ({
        id: index,
        title: task.title || `Task ${index + 1}`,
        description: task.description || '',
        priority: task.priority || 'MEDIUM',
        estimated_hours: task.effortHours || task.estimated_hours || 2,
        due_date: task.dueDate || task.due_date || null,
        category: task.category || '',
        dependsOn: task.dependsOn || task.depends_on || [],
        assessmentSection: task.assessmentSection || task.assessment_section || '',
        suggestedOwner: task.suggestedOwner || task.suggested_owner || '',
        assignmentReason: task.assignmentReason || task.assignment_reason || '',
        status: 'TO_DO',
        assigned_to_email: '',
      }));

      setPlanOutput(plan);
      setGeneratedTasks(normalized);
      setStep(6);
      setAssistantNote('AI plan ready. Review the summary and assign tasks below.');
    } catch (err) {
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

  const assignTask = (id, assigned_to_email) => {
    setGeneratedTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, assigned_to_email } : task))
    );
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
            <p className="text-sm text-slate-700 dark:text-slate-300">{assistantNote}</p>
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
                placeholder="Paste the assignment brief here; for marketing/campaign tasks include roles, deliverables, and campaign outputs like SWOT, personas, media framework, messaging hooks, budget, KPI targets, and charter PDF."
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
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fairness score</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{planSummary.fairnessScore != null ? `${planSummary.fairnessScore}%` : 'Pending'}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Balanced workload across team members.</p>
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
            <div className="text-sm text-slate-500 dark:text-slate-400">Once all tasks are assigned, publish the plan to make it available in My Tasks.</div>
            <Button onClick={handlePublishPlan} disabled={saving || !canPublish} variant="teal">
              {saving ? 'Publishing plan...' : 'Publish Plan'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
