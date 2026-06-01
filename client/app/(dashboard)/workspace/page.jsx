import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import CreateGroupButton from '@/components/workspace/CreateGroupButton';
import { Plus, Clock } from 'lucide-react';

const columns = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'bg-slate-100 dark:bg-slate-800/60',
    textColor: 'text-slate-700 dark:text-slate-300',
    tasks: [
      { id: 1, title: 'Write abstract section', assignee: 'Alice Chen', priority: 'high', due: 'Jun 3', avatar: 'AC' },
      { id: 2, title: 'Gather data sources', assignee: 'Bob Smith', priority: 'medium', due: 'Jun 5', avatar: 'BS' },
      { id: 3, title: 'Create presentation slides', assignee: 'Carol Davis', priority: 'low', due: 'Jun 10', avatar: 'CD' },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    tasks: [
      { id: 4, title: 'Literature review', assignee: 'Alice Chen', priority: 'high', due: 'May 30', avatar: 'AC' },
      { id: 5, title: 'Survey design', assignee: 'You (John)', priority: 'high', due: 'May 28', avatar: 'JS' },
      { id: 6, title: 'Data coding framework', assignee: 'Bob Smith', priority: 'medium', due: 'Jun 1', avatar: 'BS' },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    tasks: [
      { id: 7, title: 'Define research question', assignee: 'Carol Davis', priority: 'high', due: 'May 20', avatar: 'CD' },
      { id: 8, title: 'Form group and assign roles', assignee: 'You (John)', priority: 'medium', due: 'May 18', avatar: 'JS' },
      { id: 9, title: 'Project charter draft', assignee: 'Alice Chen', priority: 'medium', due: 'May 25', avatar: 'AC' },
    ],
  },
];

const priorityConfig = {
  high: { badge: 'destructive', label: 'High' },
  medium: { badge: 'warning', label: 'Medium' },
  low: { badge: 'default', label: 'Low' },
};

export default function GroupWorkspacePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Group Workspace</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Research Methods Group Project</p>
          </div>
          <CreateGroupButton />
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map(({ id, title, color, textColor, tasks }) => (
          <div key={id} className="flex flex-col gap-3">
            {/* Column header */}
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${color}`}>
              <span className={`font-semibold text-sm ${textColor}`}>{title}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/50 ${textColor}`}>
                {tasks.length}
              </span>
            </div>

            {/* Task cards */}
            <div className="space-y-3">
              {tasks.map(({ id: taskId, title: taskTitle, assignee, priority, due, avatar }) => (
                <div
                  key={taskId}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {taskTitle}
                    </p>
                    <Badge variant={priorityConfig[priority].badge}>
                      {priorityConfig[priority].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
                        {avatar}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{assignee}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="w-3 h-3" />
                      {due}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add placeholder */}
              <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-all">
                <Plus className="w-4 h-4" />
                Add a task
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
