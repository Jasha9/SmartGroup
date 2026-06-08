'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Zap } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { getNotifications } from '@/services/notificationService';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/ai-planner': 'SmartGroup Assistant',
  '/smartgroup-assistant': 'SmartGroup Assistant',
  '/workspace': 'Group Workspace',
  '/charter': 'Group Charter',
  '/contributions': 'Team Insights',
  '/team-insights': 'Team Insights',
  '/notifications': 'Action Center',
  '/action-center': 'Action Center',
};

export default function Topbar({ onMenuClick }) {
  const router = useRouter();
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'SmartGroup';
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getNotifications()
      .then((data) => {
        const list = data?.data?.notifications || data?.notifications || [];
        setUnreadCount(list.filter((n) => !n.is_read).length);
      })
      .catch(() => setUnreadCount(0));
  }, [user]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-3.5 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300 font-semibold">
          SmartGroup Assistant
        </p>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => router.push('/action-center')}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Zap className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <ThemeToggle />
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold ml-1">
          {initials}
        </div>
      </div>
    </header>
  );
}
