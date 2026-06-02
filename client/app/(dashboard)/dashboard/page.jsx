'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Progress from '@/components/ui/Progress';
import LoadingState from '@/components/ui/LoadingState';
import { TrendingUp, CheckCircle2, FileSignature, Bell } from 'lucide-react';
import api from '@/services/api';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    progress: 0,
    activeTasks: 0,
    pendingSignatures: 0,
    unreadNotifications: 0,
  });
  const [memberContributions, setMemberContributions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [groupsRes, notificationsRes] = await Promise.allSettled([
          api.get('/groups'),
          api.get('/notifications'),
        ]);

        // Groups / tasks
        if (groupsRes.status === 'fulfilled') {
          const groupsData = groupsRes.value.data;
          const groups = groupsData.groups || groupsData || [];
          if (groups.length > 0) {
            const firstGroup = groups[0];
            setGroupName(firstGroup.group_name || firstGroup.name || 'My Group');
            const groupId = firstGroup.group_id || firstGroup.id;

            // Fetch tasks and contributions for the first group
            const [tasksRes, contribRes] = await Promise.allSettled([
              api.get(`/tasks?groupId=${groupId}`),
              api.get(`/contributions/${groupId}`),
            ]);

            if (tasksRes.status === 'fulfilled') {
              const tasks = tasksRes.value.data.tasks || tasksRes.value.data || [];
              const active = tasks.filter((t) => t.status !== 'DONE').length;
              const done = tasks.filter((t) => t.status === 'DONE').length;
              const total = tasks.length;
              const pendingSig = tasks.filter((t) => !t.is_signed).length;
              setStats((prev) => ({
                ...prev,
                activeTasks: active,
                progress: total > 0 ? Math.round((done / total) * 100) : 0,
                pendingSignatures: pendingSig,
              }));
            }

            if (contribRes.status === 'fulfilled') {
              const contributions = contribRes.value.data.contributions || contribRes.value.data || [];
              setMemberContributions(contributions);
            }
          }
        }

        // Notifications
        if (notificationsRes.status === 'fulfilled') {
          const notifications = notificationsRes.value.data.notifications || notificationsRes.value.data || [];
          const unread = notifications.filter((n) => !n.is_read).length;
          setStats((prev) => ({ ...prev, unreadNotifications: unread }));
          // Use notifications as recent activity feed
          setRecentActivity(
            notifications.slice(0, 5).map((n) => ({
              message: n.message,
              time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            }))
          );
        }
      } catch {
        // Silently fail — UI will show zeros/empty state
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Overall Progress',
      value: `${stats.progress}%`,
      description: 'Project completion',
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Active Tasks',
      value: String(stats.activeTasks),
      description: 'In progress or to do',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Pending Signatures',
      value: String(stats.pendingSignatures),
      description: 'Charter approvals',
      icon: FileSignature,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      title: 'Notifications',
      value: String(stats.unreadNotifications),
      description: 'Unread alerts',
      icon: Bell,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back 👋
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {groupName ? `Active group: ${groupName}` : "Here's what's happening with your group project today."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ title, value, description, icon: Icon, color, bg }) => (
          <Card key={title} className="hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>
                </div>
                <div className={`p-3 rounded-xl ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
            <CardDescription>{groupName || 'Group Project'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={stats.progress} label="Overall completion" />
          </CardContent>
        </Card>

        {/* Contribution preview */}
        <Card>
          <CardHeader>
            <CardTitle>Team Contributions</CardTitle>
            <CardDescription>Tasks completed per member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {memberContributions.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                No contribution data yet.
              </p>
            ) : (
              memberContributions.map(({ full_name, name, percentage, completed, total, avatar }) => {
                const displayName = full_name || name || 'Member';
                const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const pct = percentage ?? (total > 0 ? Math.round((completed / total) * 100) : 0);
                return (
                  <div key={displayName} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {avatar || initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{displayName}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your team</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
              No recent activity yet.
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map(({ message, time }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    SG
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
                    {time && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{time}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

