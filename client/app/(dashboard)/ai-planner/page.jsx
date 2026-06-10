'use client';

import { useEffect, useMemo, useState } from 'react';
import { generateTasks, saveAssignedTasks } from '@/services/aiService';
import { getGroups, getGroupMembers } from '@/services/groupService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { AlertCircle, CheckCircle2, Sparkles, Upload, Users } from 'lucide-react';

const STEPS = [
  'Select Group',
  'Assessment Details',
  'Assignment Brief',
  'AI Analysis',
  'Review & Assign Members',
  'Publish Plan',
];

export default function AIPlannerPage() {
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState('text');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDueDate, setAssessmentDueDate] = useState('');
  const [promptText, setPromptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assistantNote, setAssistantNote] = useState('Select your group to begin planning.');
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

  const canGenerate = assessmentTitle.trim().length > 0 && (inputMode === 'upload' ? !!uploadedFile : promptText.trim().length > 0);
  const canPublish = generatedTasks.length > 0 && generatedTasks.every((task) => task.assigned_to_email);

  const completionPct = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);

  const handleGenerateTasks = async () => {
    try {
      setLoading(true);
      setError('');
      setSaveSuccess(false);
      setStep(3);
      setAssistantNote('Analysing assessment brief...');

      const data = await generateTasks(promptText);
      const rawTasks = data?.data?.tasks || [];
      const normalized = rawTasks.map((task, i) => ({
        id: i,
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'MEDIUM',
        estimated_hours: task.estimated_hours || 1,
        status: 'TO_DO',
        assigned_to_email: '',
      }));

      setGeneratedTasks(normalized);
      setStep(4);
      setAssistantNote(`Assignment analysed successfully. I have identified ${normalized.length} recommended tasks.`);
    } catch (err) {
      setError(err.message || 'Failed to generate tasks. Please try again.');
      setAssistantNote('I could not analyse the assignment yet. Please adjust your input and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setAssistantNote(`Uploaded ${file.name}. Ready for analysis when you are.`);
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

  const handleContinueAfterReview = () => {
    if (generatedTasks.some((task) => !task.title.trim())) {
      setError('Task title cannot be empty.');
      return;
    }
    setError('');
    setStep(5);
    setAssistantNote('Please assign team members before publishing.');
  };

  const handleSaveAssignedTasks = async () => {
    if (!selectedGroupId) {
      setError('Please select a group before publishing.');
      return;
    }

    if (generatedTasks.some((task) => !task.assigned_to_email)) {
      setError('Please assign all tasks before publishing.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await saveAssignedTasks(selectedGroupId, generatedTasks, {
        assessmentTitle: assessmentTitle.trim(),
        assessmentDescription: promptText.trim(),
        assessmentDueDate: assessmentDueDate || null,
      });
      setStep(6);
      setSaveSuccess(true);
      setAssistantNote('Project plan published. Team members have been notified in the Action Center.');
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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="sg-eyebrow">SmartGroup Assistant</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">Project Planning Wizard</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">AI-guided planning for student teams.</p>
            </div>
            <Badge variant="blue">Step {step} / {STEPS.length}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {STEPS.map((label, idx) => {
              const stepIndex = idx + 1;
              const active = stepIndex <= step;
              return (
                <div
                  key={label}
                  className={`rounded-lg px-3 py-2 text-xs font-medium border ${
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
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5" />
            <p className="text-sm text-slate-700 dark:text-slate-300">{assistantNote}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Group</CardTitle>
          <CardDescription>Choose the team this plan belongs to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setGeneratedTasks([]);
              setSaveSuccess(false);
              setStep(1);
              setAssistantNote('Group selected. Continue by adding assignment details.');
            }}
            disabled={groupsLoading}
            className="w-full max-w-md px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          >
            {groupsLoading && <option>Loading groups...</option>}
            {!groupsLoading && groups.length === 0 && <option value="">No groups found</option>}
            {groups.map((g) => (
              <option key={g.group_id || g.id} value={g.group_id || g.id}>
                {g.group_name || g.name}
              </option>
            ))}
          </select>
          {!!selectedGroupId && !membersLoading && members.length > 0 && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> {members.length} team members available for assignment
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Assessment Details</CardTitle>
          <CardDescription>Give this project plan a clear assessment title and optional due date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assessment title</label>
              <input
                value={assessmentTitle}
                onChange={(e) => {
                  setAssessmentTitle(e.target.value);
                  if (step < 2) setStep(2);
                }}
                placeholder="e.g. Final Report Draft"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date (optional)</label>
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
          <CardTitle>Step 3: Upload Assignment Brief or Paste Text</CardTitle>
          <CardDescription>Add assignment context for AI analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setInputMode('text');
                if (step < 3) setStep(3);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-[#0f172a] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => {
                setInputMode('upload');
                if (step < 3) setStep(3);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                inputMode === 'upload'
                  ? 'bg-[#0f172a] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Upload PDF
            </button>
          </div>

          {inputMode === 'text' ? (
            <textarea
              rows={7}
              placeholder="Paste your assignment brief here..."
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                if (step < 3) setStep(3);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
            />
          ) : (
            <label
              className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                uploadedFile
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/40 dark:hover:bg-teal-900/10'
              }`}
            >
              <input type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">{uploadedFile.name}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-slate-400" />
                  <p className="font-medium text-slate-600 dark:text-slate-300">Click to upload PDF</p>
                  <p className="text-xs text-slate-400">Max 10 MB</p>
                </div>
              )}
            </label>
          )}

          <Button onClick={handleGenerateTasks} disabled={!canGenerate || loading} className="w-full" variant="teal">
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-pulse mr-2" /> Running AI Analysis...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Start AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Project plan published successfully. Team members can now acknowledge responsibilities.
          </p>
        </div>
      )}

      {generatedTasks.length === 0 && !loading && (
        <div className="flex items-center justify-center p-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm">
          SmartGroup Assistant is ready to help. Generate your first project plan.
        </div>
      )}

      {generatedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Step 4-5: Review and Assign Tasks</CardTitle>
                <CardDescription>Validate tasks, then assign ownership to every member.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleContinueAfterReview} variant="outline">Continue to Assignments</Button>
                <Button onClick={handleSaveAssignedTasks} disabled={saving || !canPublish} variant="teal">
                  {saving ? 'Publishing...' : 'Publish Project Plan'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-1/4">Task</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-24">Priority</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-24">Hours</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-52">Assign To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {generatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        value={task.title}
                        onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-teal-500 focus:outline-none text-slate-900 dark:text-slate-100 text-sm py-0.5"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">{task.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant={task.priority === 'HIGH' ? 'destructive' : task.priority === 'LOW' ? 'default' : 'warning'}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task.estimated_hours}h</td>
                    <td className="px-4 py-3">
                      <select
                        value={task.assigned_to_email}
                        onChange={(e) => assignTask(task.id, e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          task.assigned_to_email
                            ? 'border-slate-200 dark:border-slate-700'
                            : 'border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        <option value="">- Assign member -</option>
                        {membersLoading && <option disabled>Loading...</option>}
                        {members.map((m) => (
                          <option key={m.user_id} value={m.email}>
                            {m.full_name || m.email}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
