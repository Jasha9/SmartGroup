'use client';

import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '@/services/notificationService';
import { acceptCharter, negotiateCharter } from '@/services/charterService';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import { Bell, CheckCircle2, ArrowLeftRight } from 'lucide-react';

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
      setError('Failed to load notifications. Please try again.');
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
      setError('Unable to mark notification as read.');
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
      setError('Failed to process notification. Please try again.');
    } finally {
      setActionLoading((current) => ({ ...current, [notificationId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mt-6">
        <LoadingState message="Loading notifications..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review recent notifications and accept or negotiate assigned tasks.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <Card>
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No notifications yet.</p>
            <p className="text-sm mt-1">You&apos;ll see task assignment alerts here once they arrive.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const isAssignedTask = notification.type === 'TASK_ASSIGNED';
            const isBusy = actionLoading[notification.notification_id];
            return (
              <Card key={notification.notification_id} className={`p-5 ${notification.is_read ? 'opacity-70' : 'shadow-md'}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Just now'}</p>
                      <p className="mt-2 text-slate-900 dark:text-slate-100">{notification.message}</p>
                    </div>
                    {!notification.is_read && (
                      <span className="inline-flex items-center rounded-full bg-blue-600 text-white text-xs font-semibold px-2.5 py-1.5">
                        New
                      </span>
                    )}
                  </div>

                  {isAssignedTask && (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => handleAction(notification.notification_id, 'accept')} disabled={isBusy}>
                        <CheckCircle2 className="w-4 h-4" />
                        {isBusy ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button variant="outline" onClick={() => handleAction(notification.notification_id, 'negotiate')} disabled={isBusy}>
                        <ArrowLeftRight className="w-4 h-4" />
                        {isBusy ? 'Requesting...' : 'Negotiate'}
                      </Button>
                    </div>
                  )}

                  {!notification.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(notification.notification_id)}>
                      Mark as read
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
