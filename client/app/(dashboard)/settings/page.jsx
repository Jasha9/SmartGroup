'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/services/authService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ThemeToggle from '@/components/theme/ThemeToggle';
import LoadingState from '@/components/ui/LoadingState';
import { User, Mail, Shield, Palette, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading, refreshUser, logoutUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (user) setDisplayName(user.full_name || '');
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);
    if (!displayName.trim()) {
      setSaveError('Display name cannot be empty.');
      return;
    }
    if (displayName.trim() === user?.full_name) {
      setSaveSuccess(true);
      return;
    }
    try {
      setSaving(true);
      await updateProfile({ full_name: displayName.trim() });
      await refreshUser();
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err?.response?.data?.error || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-6">
        <LoadingState message="Loading settings..." />
      </div>
    );
  }

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : '?';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage your account and preferences.</p>
      </div>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Update your display name shown to teammates.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Avatar + account info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{user?.full_name || '—'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
              {joined && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Member since {joined}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Display name
              </label>
              <Input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setSaveSuccess(false);
                  setSaveError('');
                }}
                placeholder="Your full name"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-500 dark:text-slate-400">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>{user?.email}</span>
                <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  Google account
                </span>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Changes saved successfully.</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Role info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <CardTitle>Role & Permissions</CardTitle>
          </div>
          <CardDescription>Your role determines what you can do in SmartGroup.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Account role</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Roles are assigned by your administrator.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Student'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-500" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Toggle between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Switch between light and dark.</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-slate-500" />
            <CardTitle>Sign out</CardTitle>
          </div>
          <CardDescription>Sign out from your SmartGroup account on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={logoutUser} className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
