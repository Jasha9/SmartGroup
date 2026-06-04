'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import api from '@/services/api';

const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['TO_DO', 'IN_PROGRESS', 'DONE'];

export default function AddTaskModal({ isOpen, onClose, groupId, onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TO_DO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setAssigneeEmail('');
    setDueDate('');
    setPriority('MEDIUM');
    setStatus('TO_DO');
    setError('');
    setLoading(false);
  }, [isOpen]);

  const handleClose = (taskData) => {
    setLoading(false);
    setError('');
    onClose(taskData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!groupId) {
      setError('Group is required to create a task.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.post('/tasks', {
        groupId,
        tasks: [
          {
            title: title.trim(),
            description: description.trim(),
            priority,
            status,
            assigned_to_email: assigneeEmail.trim() || undefined,
            due_date: dueDate || undefined,
          },
        ],
      });
      const createdTask = response.data?.tasks?.[0] || null;
      handleClose(createdTask);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => handleClose()} title="Add New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task title"
          placeholder="e.g. Design slides for meeting"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            rows={3}
            placeholder="Optional task description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Assignee email"
          placeholder="assignee@gmail.com"
          value={assigneeEmail}
          onChange={(e) => setAssigneeEmail(e.target.value)}
        />

        <Input
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={() => handleClose()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Create Task'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        )}
      </form>
    </Modal>
  );
}
