import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { CheckCircle2, ArrowLeftRight, FileText, Shield } from 'lucide-react';

const responsibilities = [
  {
    id: 1,
    member: 'Alice Chen',
    avatar: 'AC',
    role: 'Lead Researcher',
    tasks: ['Literature review', 'Methodology design', 'Academic sourcing'],
    status: 'accepted',
    isYou: false,
  },
  {
    id: 2,
    member: 'Bob Smith',
    avatar: 'BS',
    role: 'Data Analyst',
    tasks: ['Survey design', 'Statistical analysis', 'Data visualisation'],
    status: 'negotiating',
    isYou: false,
  },
  {
    id: 3,
    member: 'Carol Davis',
    avatar: 'CD',
    role: 'Qualitative Analyst',
    tasks: ['Interview coding', 'Thematic analysis', 'Ethics compliance'],
    status: 'pending',
    isYou: false,
  },
  {
    id: 4,
    member: 'John Smith (You)',
    avatar: 'JS',
    role: 'Project Lead',
    tasks: ['Project coordination', 'Final report writing', 'Presentation lead'],
    status: 'accepted',
    isYou: true,
  },
];

const statusConfig = {
  accepted: { badge: 'accepted', label: 'Accepted' },
  pending: { badge: 'pending', label: 'Pending' },
  negotiating: { badge: 'negotiating', label: 'Negotiating' },
};

export default function CharterPage() {
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

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">2 / 4</p>
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
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">1</p>
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
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">50%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Charter complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responsibility cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {responsibilities.map(({ id, member, avatar, role, tasks, status, isYou }) => (
          <Card
            key={id}
            className={isYou ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                    {avatar}
                  </div>
                  <div>
                    <CardTitle className="text-base">{member}</CardTitle>
                    <CardDescription>{role}</CardDescription>
                  </div>
                </div>
                <Badge variant={statusConfig[status].badge}>{statusConfig[status].label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 mb-4">
                {tasks.map((task) => (
                  <li key={task} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>

              {isYou && status !== 'accepted' && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Accept Responsibility
                  </Button>
                  <Button variant="outline" size="sm">
                    <ArrowLeftRight className="w-4 h-4" />
                    Request Swap
                  </Button>
                </div>
              )}
              {isYou && status === 'accepted' && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  You&apos;ve accepted these responsibilities
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
