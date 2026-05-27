'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Upload, Sparkles, AlertCircle, CheckCircle2, Edit2, Trash2 } from 'lucide-react';

const initialTasks = [
  { id: 1, title: 'Conduct literature review on mixed methods research', assignee: 'Alice Chen', dueDate: 'Jun 3', priority: 'high', accepted: false },
  { id: 2, title: 'Design survey instrument with 20+ questions', assignee: 'Bob Smith', dueDate: 'Jun 5', priority: 'high', accepted: false },
  { id: 3, title: 'Collect and code qualitative interview data', assignee: 'Carol Davis', dueDate: 'Jun 10', priority: 'medium', accepted: false },
  { id: 4, title: 'Perform statistical analysis using SPSS', assignee: 'You (John)', dueDate: 'Jun 15', priority: 'medium', accepted: false },
  { id: 5, title: 'Write methodology chapter', assignee: 'Alice Chen', dueDate: 'Jun 20', priority: 'medium', accepted: false },
];

const USAGE = 3;
const USAGE_MAX = 10;

export default function AIPlannerPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [uploaded, setUploaded] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
    }, 1500);
  };

  const toggleAccept = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, accepted: !t.accepted } : t)));

  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

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

            <Button onClick={handleGenerate} disabled={!uploaded || loading} className="w-full">
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
                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
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

      {/* Task preview */}
      {generated && (
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
              {tasks.map((task) => (
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
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>Assignee: {task.assignee}</span>
                      <span>Due: {task.dueDate}</span>
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
