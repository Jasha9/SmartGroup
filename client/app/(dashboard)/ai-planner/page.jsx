'use client';

import { useState, useEffect } from 'react';
import { generateTasks, getGroups, saveTasks } from '@/services/aiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Upload, Sparkles, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

export default function AIPlannerPage() {
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'upload'
  const [promptText, setPromptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [usage, setUsage] = useState(0);
  const USAGE_MAX = 3;

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        const list = Array.isArray(data) ? data : (data.groups || data.sampleGroups || []);
        setGroups(list);
        if (list.length > 0) setSelectedGroupId(list[0].group_id || list[0].id || '');
      } catch {
        // groups will remain empty; user sees empty dropdown
      } finally {
        setGroupsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const handleGenerateTasks = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      setError('');
      setSaveSuccess(false);
      const data = await generateTasks(selectedGroupId, inputMode === 'text' ? promptText : '');
      setGeneratedTasks(data.tasks || []);
      setUsage(data.usage ?? usage);
    } catch (err) {
      setError(err.message || 'Failed to generate tasks. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccept = (id) =>
    setGeneratedTasks((prev) => prev.map((t) => (t.id === id ? { ...t, accepted: !t.accepted } : t)));

  const removeTask = (id) => setGeneratedTasks((prev) => prev.filter((t) => t.id !== id));

  const handleSaveAccepted = async () => {
    const accepted = generatedTasks.filter((t) => t.accepted);
    if (!accepted.length) return;
    try {
      setSaving(true);
      setError('');
      await saveTasks(selectedGroupId, accepted);
      setSaveSuccess(true);
      setGeneratedTasks([]);
    } catch (err) {
      setError(err.message || 'Failed to save tasks.');
    } finally {
      setSaving(false);
    }
  };

  const canGenerate = selectedGroupId && (inputMode === 'upload' ? uploadedFile : promptText.trim().length > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AI Planner</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload your assignment brief and let AI generate a task plan.
        </p>
      </div>

      {/* Group selector */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Select Group
        </label>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          disabled={groupsLoading}
          className="w-full max-w-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {groupsLoading && <option>Loading groups…</option>}
          {!groupsLoading && groups.length === 0 && <option value="">No groups found</option>}
          {groups.map((g) => (
            <option key={g.group_id || g.id} value={g.group_id || g.id}>
              {g.group_name || g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Input card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Assignment Brief</CardTitle>
            <CardDescription>Paste your brief or upload a PDF</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('text')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  inputMode === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => setInputMode('upload')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  inputMode === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Upload PDF
              </button>
            </div>

            {inputMode === 'text' ? (
              <textarea
                rows={7}
                placeholder="Paste your assignment brief here…"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            ) : (
              <label className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                uploadedFile
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
              }`}>
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

            <Button onClick={handleGenerateTasks} disabled={!canGenerate || loading} className="w-full">
              {loading ? (
                <><Sparkles className="w-4 h-4 animate-pulse" /> Generating…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Tasks with AI</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Usage quota */}
        <Card>
          <CardHeader>
            <CardTitle>AI Usage</CardTitle>
            <CardDescription>Daily quota (per group)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                  <circle
                    cx="48" cy="48" r="40" fill="none" strokeWidth="8"
                    stroke="url(#usageGrad)"
                    strokeDasharray={`${(usage / USAGE_MAX) * 251.2} 251.2`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="usageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{usage}</span>
                  <span className="text-xs text-slate-400">/ {USAGE_MAX}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {USAGE_MAX - usage} generation{USAGE_MAX - usage !== 1 ? 's' : ''} remaining
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Resets every 24 hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Human-in-the-loop notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Human review required.</span> AI suggestions must be
          reviewed and accepted before saving to the Group Workspace.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Save success */}
      {saveSuccess && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Tasks saved to the Group Workspace successfully.
          </p>
        </div>
      )}

      {/* AI-returned task preview */}
      {generatedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI-Generated Task Plan</CardTitle>
                <CardDescription>Review each task before saving to workspace</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAccepted}
                disabled={saving || !generatedTasks.some((t) => t.accepted)}
              >
                {saving ? 'Saving…' : 'Save Accepted'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {generatedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                    task.accepted ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {task.title}
                      </p>
                      {task.priority && (
                        <Badge variant={task.priority === 'High' ? 'destructive' : 'default'}>
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {task.description}
                      </p>
                    )}
                    {task.effort_hours && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Estimated: {task.effort_hours}h
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => toggleAccept(task.id)}>
                      {task.accepted ? 'Undo' : 'Accept'}
                    </Button>
                    <button
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={() => removeTask(task.id)}
                      aria-label="Remove task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
