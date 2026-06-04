'use client';

import { useState, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import api from '@/services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateGroupModal({ isOpen, onClose, group = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Member invite state
  const [memberEmails, setMemberEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const emailInputRef = useRef(null);

  const isEdit = Boolean(group && (group.group_id || group.id));

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit) {
      setName(group.group_name || group.name || '');
      setDescription(group.description || '');
      setMemberEmails([]);
      setEmailInput('');
      setEmailError('');
      setNameError('');
      setApiError('');
    } else {
      setName('');
      setDescription('');
      setMemberEmails([]);
      setEmailInput('');
      setEmailError('');
      setNameError('');
      setApiError('');
    }
  }, [group, isEdit, isOpen]);

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setEmailError('Enter a valid Gmail address.');
      return;
    }
    if (memberEmails.includes(email)) {
      setEmailError('Already added.');
      return;
    }
    setMemberEmails((prev) => [...prev, email]);
    setEmailInput('');
    setEmailError('');
    emailInputRef.current?.focus();
  };

  const removeEmail = (email) => setMemberEmails((prev) => prev.filter((e) => e !== email));

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
    if (e.key === 'Backspace' && !emailInput && memberEmails.length > 0) {
      removeEmail(memberEmails[memberEmails.length - 1]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Group name is required.');
      return;
    }
    // Commit any half-typed email before submitting
    if (emailInput.trim()) addEmail();

    try {
      setLoading(true);
      setApiError('');
      const payload = {
        name: name.trim(),
        description: description.trim(),
        memberEmails,
      };

      const response = isEdit
        ? await api.put(`/groups/${group.group_id || group.id}`, payload)
        : await api.post('/groups', payload);

      handleClose(response.data);
    } catch (err) {
      setApiError(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} group. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (groupData) => {
    setName('');
    setDescription('');
    setNameError('');
    setApiError('');
    setLoading(false);
    setMemberEmails([]);
    setEmailInput('');
    setEmailError('');
    onClose(groupData);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Edit Group' : 'Create a New Group'}>
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

        {/* Member invite by email */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Invite Members{' '}
            <span className="text-slate-400 dark:text-slate-500 font-normal">(by Gmail address)</span>
          </label>

          {/* Chip container + input */}
          <div
            className="flex flex-wrap gap-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all cursor-text min-h-[42px]"
            onClick={() => emailInputRef.current?.focus()}
          >
            {memberEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium"
              >
                {email}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeEmail(email); }}
                  className="hover:text-blue-500 dark:hover:text-blue-200 leading-none"
                  aria-label={`Remove ${email}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={emailInputRef}
              type="text"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
              onKeyDown={handleEmailKeyDown}
              onBlur={addEmail}
              placeholder={memberEmails.length === 0 ? 'teammate@gmail.com, press Enter to add' : ''}
              className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            />
          </div>

          {emailError && (
            <p className="text-xs text-red-500 dark:text-red-400">{emailError}</p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Each invitee will receive a dashboard notification once they sign in with that Gmail.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={() => handleClose()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (isEdit ? 'Updating…' : 'Saving…') : isEdit ? 'Update Group' : 'Create Group'}
          </Button>
        </div>

        {apiError && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{apiError}</p>
        )}
      </form>
    </Modal>
  );
}
