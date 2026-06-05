'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups } from '@/services/groupService';
import { getCharter, acceptCharter, negotiateCharter } from '@/services/charterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import { CheckCircle2, ArrowLeftRight, FileText, Shield } from 'lucide-react';

const STATUS_CONFIG = {
  ACCEPTED: { badge: 'accepted', label: 'Accepted / TO_DO' },
  PENDING: { badge: 'pending', label: 'Pending Acceptance' },
  PENDING_ACCEPTANCE: { badge: 'pending', label: 'Pending Acceptance' },
  NEGOTIATING: { badge: 'negotiating', label: 'Negotiating' },
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function CharterPage() {
  const { user } = useAuth();
  const [responsibilities, setResponsibilities] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  const fetchCharter = useCallback(async (group) => {
    if (!group) return;
    setLoading(true);
    setError(null);
    try {
      const groupId = group.group_id || group.id;
      const data = await getCharter(groupId);
      setResponsibilities(data?.data?.responsibilities || []);
    } catch {
      setError('Failed to load charter. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const data = await getGroups();
        const list = data?.data?.groups || data?.groups || [];
        if (list.length > 0) {
          setSelectedGroup(list[0]);
          fetchCharter(list[0]);
        } else {
          setLoading(false);
        }
      } catch {
        setError('Failed to load groups.');
        setLoading(false);
      }
    }
    init();
  }, [fetchCharter]);

  const handleAccept = async (responsibility) => {
    if (!selectedGroup) return;
    const groupId = selectedGroup.group_id || selectedGroup.id;
    const taskId = responsibility.task_id;
    setActionLoading((current) => ({ ...current, [taskId]: true }));
    setError(null);
    try {
      await acceptCharter({ taskId, groupId });
      await fetchCharter(selectedGroup);
    } catch {
      setError('Failed to accept responsibility. Please try again.');
    } finally {
      setActionLoading((current) => ({ ...current, [taskId]: false }));
    }
  };

  const handleNegotiate = async (responsibility) => {
    if (!selectedGroup) return;
    const groupId = selectedGroup.group_id || selectedGroup.id;
    const taskId = responsibility.task_id;
    setActionLoading((current) => ({ ...current, [taskId]: true }));
    setError(null);
    try {
      await negotiateCharter({ taskId, groupId });
      await fetchCharter(selectedGroup);
    } catch {
      setError('Failed to request negotiation. Please try again.');
    } finally {
      setActionLoading((current) => ({ ...current, [taskId]: false }));
    }
  };

  // Derived stats
  const accepted = responsibilities.filter((r) => r.status === 'accepted' || r.is_signed).length;
  const total = responsibilities.length;
  const swapRequests = responsibilities.filter((r) => r.status === 'negotiating').length;
  const completionPct = total > 0 ? Math.round((accepted / total) * 100) : 0;

  // Current user's entry
  const myEntry = user
    ? responsibilities.find(
        (r) => r.user_id === user.user_id || r.email === user.email
      )
    : null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mt-6">
        <LoadingState message="Loading charter information..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Group Charter</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review and accept your assigned responsibilities.
          </p>
        </div>
        <Button variant="outline">
          <FileText className="w-4 h-4" />
          Export Charter
        </Button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && responsibilities.length === 0 && (
        <Card>
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No charter responsibilities yet</p>
            <p className="text-sm mt-1">Generate or assign tasks first to populate the charter.</p>
          </div>
        </Card>
      )}

      {responsibilities.length > 0 && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{accepted} / {total}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Members accepted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <ArrowLeftRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{swapRequests}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Swap requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{completionPct}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Charter complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Responsibility cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {responsibilities.map((r) => {
              const isYou = user && (r.user_id === user.user_id || r.email === user.email);
              const status = r.is_signed ? 'accepted' : (r.status || 'pending');
              const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const initials = getInitials(r.full_name);

              return (
                <Card
                  key={r.charter_id}
                  className={isYou ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950' : ''}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                          {initials}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {r.full_name || r.email}{isYou ? ' (You)' : ''}
                          </CardTitle>
                          <CardDescription>{r.task_title}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={statusCfg.badge}>{statusCfg.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {r.task_description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {r.task_description}
                      </p>
                    )}

                    {isYou && !r.is_signed && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAccept(r)}
                          disabled={actionLoading[r.task_id]}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {actionLoading[r.task_id] ? 'Accepting...' : 'Accept Responsibility'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNegotiate(r)}
                          disabled={actionLoading[r.task_id]}
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          {actionLoading[r.task_id] ? 'Requesting...' : 'Request Negotiation'}
                        </Button>
                      </div>
                    )}
                    {isYou && r.is_signed && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        You&apos;ve accepted these responsibilities
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

