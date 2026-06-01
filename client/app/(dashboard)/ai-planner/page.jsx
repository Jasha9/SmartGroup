'use client';

import { useState } from 'react';
import { generateTasks } from '@/services/aiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Upload, Sparkles, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

const USAGE = 3;
const USAGE_MAX = 10;

export default function AIPlannerPage() {
  const [uploaded, setUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [error, setError] = useState('');

  const handleGenerateTasks = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await generateTasks();

      setGeneratedTasks(data.tasks || []);
    } catch (err) {
      console.error(err);
      setError('Failed to generate tasks. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const removeTask = (id) =>
    setGeneratedTasks((prev) => prev.filter((t) => t.id !== id));

  const toggleAccept = (id) =>
    setGeneratedTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, accepted: !t.accepted } : t))
    );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AI Planner</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload your assignment brief and let AI generate a task plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upload card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upload Assignment Brief</CardTitle>
            <CardDescription>PDF, DOCX, or TXT — max 10 MB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => setUploaded(true)}
              className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                uploaded
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
              }`}
            >
              {uploaded ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">
                    assignment-brief.pdf uploaded
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-slate-400" />
                  <p className="font-medium text-slate-600 dark:text-slate-300">Click to upload</p>
                  <p className="text-xs text-slate-400">or drag and drop</p>
                </div>
              )}
            </button>

            <Button
              onClick={handleGenerateTasks}
              disabled={!uploaded || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Tasks with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Usage quota */}
        <Card>
          <CardHeader>
            <CardTitle>AI Usage</CardTitle>
            <CardDescription>Monthly quota</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48" cy="48" r="40" fill="none" stroke="currentColor"
                    strokeWidth="8" className="text-slate-100 dark:text-slate-800"
                  />
                  <circle
                    cx="48" cy="48" r="40" fill="none" strokeWidth="8"
                    stroke="url(#usageGrad)"
                    strokeDasharray={`${(USAGE / USAGE_MAX) * 251.2} 251.2`}
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
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{USAGE}</span>
                  <span className="text-xs text-slate-400">/ {USAGE_MAX}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {USAGE_MAX - USAGE} generations remaining
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Resets Jun 1, 2026</p>
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

      {/* AI-returned task preview */}
      {generatedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI-Generated Task Plan</CardTitle>
                <CardDescription>Review each task before saving to workspace</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Save Accepted
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
                      <Badge variant={task.priority === 'high' ? 'destructive' : 'default'}>
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      {task.assigned_to && <span>Assignee: {task.assigned_to}</span>}
                      {task.status && <span>Status: {task.status}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.accepted ? (
                      <Badge variant="accepted">Accepted</Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => toggleAccept(task.id)}>
                        Accept
                      </Button>
                    )}
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
