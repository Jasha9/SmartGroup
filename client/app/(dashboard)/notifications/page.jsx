'use client';

import { useEffect, useMemo, useState } from 'react';
import { getNotifications, markNotificationRead } from '@/services/notificationService';
import { acceptCharter, negotiateCharter } from '@/services/charterService';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import Badge from '@/components/ui/Badge';
import { Zap, CheckCircle2, ArrowLeftRight, ShieldAlert } from 'lucide-react';

function getCardMeta(notification) {
  if (notification.type === 'TASK_ASSIGNED') {
    return {
      heading: 'Task Assigned',
      actionLabelA: 'Accept Responsibility',
      actionLabelB: 'Request Negotiation',
      icon: <CheckCircle2 className="w-4 h-4 text-teal-600" />,
    };
  }

  if ((notification.type || '').toUpperCase().includes('SWAP')) {
    return {
      heading: 'Task Swap Request',
      actionLabelA: 'Approve',
      actionLabelB: 'Decline',
      icon: <ArrowLeftRight className="w-4 h-4 text-indigo-600" />,
    };
  }

  return {
    heading: 'Team Alert',
    actionLabelA: 'Acknowledge',
    actionLabelB: 'Review Later',
    icon: <ShieldAlert className="w-4 h-4 text-amber-500" />,
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      const list = data?.data?.notifications || data?.notifications || [];
      setNotifications(list);
    } catch {
      setError('Failed to load Action Center items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((current) => current.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)));
    } catch {
      setError('Unable to mark item as reviewed.');
    }
  };

  const handleAction = async (notificationId, action) => {
    setError(null);
    setActionLoading((current) => ({ ...current, [notificationId]: true }));
    try {
      if (action === 'accept') {
        await acceptCharter({ notificationId });
      } else {
        await negotiateCharter({ notificationId });
      }
      await markNotificationRead(notificationId);
      await fetchNotifications();
    } catch {
      setError('Failed to process action. Please try again.');
    } finally {
      setActionLoading((current) => ({ ...current, [notificationId]: false }));
    }
  };

  const summary = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read).length;
    const assignments = notifications.filter((n) => n.type === 'TASK_ASSIGNED').length;
    return { unread, assignments };
  }, [notifications]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mt-6">
        <LoadingState message="Loading Action Center..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card>
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="sg-eyebrow">Action Required</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Action Center</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Task assignments, acknowledgements, negotiations, and team alerts.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="warning">{summary.unread} Pending</Badge>
            <Badge variant="blue">{summary.assignments} Assignments</Badge>
          </div>
        </div>
      </Card>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <Card>
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No actions require your attention right now.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const isAssignedTask = notification.type === 'TASK_ASSIGNED';
            const isBusy = actionLoading[notification.notification_id];
            const meta = getCardMeta(notification);

            return (
              <Card key={notification.notification_id} className={`p-5 ${notification.is_read ? 'opacity-80' : 'shadow-md border-teal-200/60 dark:border-teal-800/60'}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {meta.icon}
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meta.heading}</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Just now'}
                      </p>
                      <p className="mt-2 text-slate-800 dark:text-slate-200">{notification.message}</p>
                    </div>
                    {!notification.is_read && (
                      <span className="inline-flex items-center rounded-full bg-teal-600 text-white text-xs font-semibold px-2.5 py-1.5">
                        Action Needed
                      </span>
                    )}
                  </div>

                  {isAssignedTask && (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => handleAction(notification.notification_id, 'accept')} disabled={isBusy} variant="teal">
                        <CheckCircle2 className="w-4 h-4" />
                        {isBusy ? 'Processing...' : meta.actionLabelA}
                      </Button>
                      <Button variant="outline" onClick={() => handleAction(notification.notification_id, 'negotiate')} disabled={isBusy}>
                        <ArrowLeftRight className="w-4 h-4" />
                        {isBusy ? 'Processing...' : meta.actionLabelB}
                      </Button>
                    </div>
                  )}

                  {!notification.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(notification.notification_id)}>
                      Mark as reviewed
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
