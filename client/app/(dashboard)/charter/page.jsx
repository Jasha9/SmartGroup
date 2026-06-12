'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroups } from '@/services/groupService';
import { getCharter, acceptCharter, negotiateCharter } from '@/services/charterService';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';

function formatDate(dateStr) {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'No due date';
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusVariant(status, isSigned) {
  if (isSigned || String(status || '').toUpperCase() === 'ACCEPTED') return 'accepted';
  const s = String(status || '').toUpperCase();
  if (s === 'NEGOTIATING' || s === 'CHANGE_REQUESTED') return 'negotiating';
  if (s === 'PENDING' || s === 'PENDING_ACCEPTANCE') return 'pending';
  return 'default';
}

function statusLabel(status, isSigned) {
  if (isSigned || String(status || '').toUpperCase() === 'ACCEPTED') return 'Accepted';
  const s = String(status || '').toUpperCase();
  if (s === 'NEGOTIATING') return 'Request Change';
  if (s === 'PENDING_ACCEPTANCE') return 'Pending Acceptance';
  return s
    .split('_')
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ');
}

export default function ResponsibilitiesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [collapsed, setCollapsed] = useState({});

  const loadResponsibilities = useCallback(async () => {
    try {
      setError(null);
      const groupsRes = await getGroups();
      const groups = groupsRes?.data?.groups || groupsRes?.groups || [];

      const charterResults = await Promise.all(
        groups.map(async (group) => {
          const groupId = group.group_id || group.id;
          const charter = await getCharter(groupId);
          const responsibilities = charter?.data?.responsibilities || charter?.responsibilities || [];
          return responsibilities.map((item) => ({
            ...item,
            group_name: item.group_name || group.group_name || group.name || 'Unknown Group',
          }));
        })
      );

      const flat = charterResults.flat();
      setRows(flat);
    } catch {
      setError('Failed to load responsibilities. Please try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResponsibilities();
  }, [loadResponsibilities]);

  const grouped = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const groupKey = row.group_id || row.group_name || 'unknown-group';
      const assessmentKey = row.assessment_id || row.assessment_title || 'unassigned-assessment';
      const compositeKey = `${groupKey}::${assessmentKey}`;

      if (!map.has(compositeKey)) {
        map.set(compositeKey, {
          key: compositeKey,
          group_id: row.group_id,
          group_name: row.group_name || 'Unknown Group',
          assessment_id: row.assessment_id,
          assessment_title: row.assessment_title || 'Unassigned Assessment',
          due_date: row.due_date || null,
          rows: [],
        });
      }

      map.get(compositeKey).rows.push(row);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.group_name !== b.group_name) return a.group_name.localeCompare(b.group_name);
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  }, [rows]);

  const toggleCollapsed = (key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAccept = async (row) => {
    setActionLoading((prev) => ({ ...prev, [row.charter_id]: true }));
    setError(null);
    try {
      await acceptCharter({ taskId: row.task_id, groupId: row.group_id });
      await loadResponsibilities();
    } catch {
      setError('Failed to accept responsibility. Please try again.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [row.charter_id]: false }));
    }
  };

  const handleRequestChange = async (row) => {
    setActionLoading((prev) => ({ ...prev, [row.charter_id]: true }));
    setError(null);
    try {
      await negotiateCharter({ taskId: row.task_id, groupId: row.group_id });
      await loadResponsibilities();
    } catch {
      setError('Failed to request change. Please try again.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [row.charter_id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-6">
        <LoadingState message="Loading responsibilities..." />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="space-y-1">
        <p className="sg-eyebrow">Responsibility Management</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Responsibilities</h2>
        <p className="text-slate-500 dark:text-slate-400">Grouped by group and assessment.</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {grouped.length === 0 ? (
        <Card className="p-10 text-center text-slate-500 dark:text-slate-400">
          No responsibilities assigned yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map((section) => {
            const isClosed = Boolean(collapsed[section.key]);
            return (
              <Card key={section.key} className="p-4">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(section.key)}
                  className="w-full text-left"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{section.group_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {section.assessment_title} · Due {formatDate(section.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="blue">{section.rows.length} tasks</Badge>
                      <Badge variant="default">{isClosed ? 'Expand' : 'Collapse'}</Badge>
                    </div>
                  </div>
                </button>

                {!isClosed && (
                  <div className="mt-3 space-y-2">
                    <div className="hidden md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 px-2">
                      <span>Task</span>
                      <span>Assessment</span>
                      <span>Group</span>
                      <span>Assigned To</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>

                    {section.rows.map((row) => {
                      const mine = row.user_id === user?.user_id || row.email === user?.email;
                      const busy = Boolean(actionLoading[row.charter_id]);
                      const signed = Boolean(row.is_signed) || String(row.status || '').toUpperCase() === 'ACCEPTED';
                      const pending = !signed;

                      return (
                        <div key={row.charter_id} className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/80 dark:bg-slate-900/50 text-sm">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{row.task_title}</span>
                          <span className="text-slate-600 dark:text-slate-300">{row.assessment_title || 'Unassigned Assessment'}</span>
                          <span className="text-slate-600 dark:text-slate-300">{row.group_name}</span>
                          <span className="text-slate-600 dark:text-slate-300">{mine ? `${row.full_name || row.email} (You)` : row.full_name || row.email}</span>
                          <div>
                            <Badge variant={statusVariant(row.status, row.is_signed)}>{statusLabel(row.status, row.is_signed)}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5 md:justify-end">
                            {mine && pending && (
                              <>
                                <Button size="sm" variant="teal" onClick={() => handleAccept(row)} disabled={busy}>Accept</Button>
                                <Button size="sm" variant="outline" onClick={() => handleRequestChange(row)} disabled={busy}>Request Change</Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost">View Details</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
