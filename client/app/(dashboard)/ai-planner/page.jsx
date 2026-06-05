'use client';

import { useEffect, useState } from 'react';
import { generateTasks, saveAssignedTasks } from '@/services/aiService';
import { getGroups, getGroupMembers } from '@/services/groupService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { AlertCircle, CheckCircle2, Sparkles, Upload, Users } from 'lucide-react';

export default function AIPlannerPage() {
  const [inputMode, setInputMode] = useState('text');
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

  const handleGenerateTasks = async () => {
    try {
      setLoading(true);
      setError('');
      setSaveSuccess(false);

      const data = await generateTasks(promptText);
      const rawTasks = data?.data?.tasks || [];
      setGeneratedTasks(
        rawTasks.map((task, i) => ({
          id: i,
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'MEDIUM',
          estimated_hours: task.estimated_hours || 1,
          status: 'TO_DO',
          assigned_to_email: '',
        }))
      );
    } catch (err) {
      setError(err.message || 'Failed to generate tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const updateTaskTitle = (id, title) => {
    setGeneratedTasks((prev) => prev.map((task) => (task.id === id ? { ...task, title } : task)));
  };

  const assignTask = (id, assigned_to_email) => {
    setGeneratedTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, assigned_to_email } : task))
    );
  };

  const handleSaveAssignedTasks = async () => {
    if (!selectedGroupId) {
      setError('Please select a group before saving.');
      return;
    }

    if (generatedTasks.some((task) => !task.title.trim())) {
      setError('Task title cannot be empty.');
      return;
    }

    if (generatedTasks.some((task) => !task.assigned_to_email)) {
      setError('Please assign all tasks before saving.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await saveAssignedTasks(selectedGroupId, generatedTasks);
      setSaveSuccess(true);
      setGeneratedTasks([]);
    } catch (err) {
      setError(err.message || 'Failed to save tasks.');
    } finally {
      setSaving(false);
    }
  };

  const canGenerate = inputMode === 'upload' ? !!uploadedFile : promptText.trim().length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AI Planner</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Select group, generate tasks, assign members, and save in one flow.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select Group</label>
        <select
          value={selectedGroupId}
          onChange={(e) => {
            setSelectedGroupId(e.target.value);
            setGeneratedTasks([]);
            setSaveSuccess(false);
          }}
          disabled={groupsLoading}
          className="w-full max-w-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            <Users className="w-3 h-3" /> {members.length} member{members.length === 1 ? '' : 's'} in this group
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Brief</CardTitle>
          <CardDescription>Paste assignment text or upload a PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              placeholder="Paste your assignment brief here..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          ) : (
            <label
              className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                uploadedFile
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
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

          <Button onClick={handleGenerateTasks} disabled={!canGenerate || loading} className="w-full">
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-pulse mr-2" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Generate Tasks with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Assign every task to a member before saving. Notifications are triggered automatically.
        </p>
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
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Tasks assigned successfully. Team members have been notified.
          </p>
        </div>
      )}

      {generatedTasks.length === 0 && !loading && (
        <div className="flex items-center justify-center p-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm">
          No tasks generated yet. Enter assignment details to begin.
        </div>
      )}

      {generatedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Generated Tasks</CardTitle>
                <CardDescription>Review and assign each task</CardDescription>
              </div>
                <Button onClick={handleSaveAssignedTasks} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Assigned Tasks'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-1/4">Task</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-24">Priority</th>
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-24">Estimated Hours</th>
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
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:outline-none text-slate-900 dark:text-slate-100 text-sm py-0.5"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">
                      {task.description}
                    </td>
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
                        className={`w-full px-2 py-1.5 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          task.assigned_to_email
                            ? 'border-slate-200 dark:border-slate-700'
                            : 'border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        <option value="">- Assign member -</option>
                        {membersLoading && <option disabled>Loading...</option>}
                        {members.map((m) => (
                          <option key={m.user_id} value={m.email}>
                            {m.full_name}
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