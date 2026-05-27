import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Progress from '@/components/ui/Progress';
import { TrendingUp, CheckCircle2, FileSignature, Bell } from 'lucide-react';

const stats = [
  {
    title: 'Overall Progress',
    value: '68%',
    description: 'Project completion',
    icon: TrendingUp,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    title: 'Active Tasks',
    value: '12',
    description: '3 due today',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    title: 'Pending Signatures',
    value: '2',
    description: 'Charter approvals',
    icon: FileSignature,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    title: 'Notifications',
    value: '5',
    description: 'Unread messages',
    icon: Bell,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
];

const recentActivity = [
  { user: 'Alice Chen', action: 'completed task', target: 'Literature Review', time: '2h ago', avatar: 'AC' },
  { user: 'Bob Smith', action: 'accepted responsibility for', target: 'Data Analysis', time: '4h ago', avatar: 'BS' },
  { user: 'Carol Davis', action: 'added a comment to', target: 'Project Charter', time: '6h ago', avatar: 'CD' },
  { user: 'You', action: 'uploaded', target: 'Assignment brief.pdf', time: '1d ago', avatar: 'JS' },
];

const memberContributions = [
  { name: 'Alice Chen', percentage: 82, avatar: 'AC' },
  { name: 'Bob Smith', percentage: 74, avatar: 'BS' },
  { name: 'Carol Davis', percentage: 69, avatar: 'CD' },
  { name: 'You (John)', percentage: 87, avatar: 'JS' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back, John 👋
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s what&apos;s happening with your group project today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ title, value, description, icon: Icon, color, bg }) => (
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
            <CardDescription>Research Methods Group Project — Due in 3 weeks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={68} label="Overall completion" />
            <Progress value={90} label="Literature Review" />
            <Progress value={55} label="Data Collection" />
            <Progress value={30} label="Analysis & Writing" />
            <Progress value={0} label="Final Submission" />
          </CardContent>
        </Card>

        {/* Contribution preview */}
        <Card>
          <CardHeader>
            <CardTitle>Team Contributions</CardTitle>
            <CardDescription>This week&apos;s activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {memberContributions.map(({ name, percentage, avatar }) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.map(({ user, action, target, time, avatar }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {avatar}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{user}</span> {action}{' '}
                  <span className="font-medium text-blue-600 dark:text-blue-400">{target}</span>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
