'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function CreateGroupModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Group name is required.');
      return;
    }
    // TODO: wire up to backend API
    console.log('Creating group:', { name: name.trim(), description: description.trim() });
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setNameError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create a New Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. Research Methods Project"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(''); }}
          error={nameError}
          autoFocus
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="What is this group working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
