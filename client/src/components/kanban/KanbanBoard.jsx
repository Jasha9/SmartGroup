import React from 'react';
import LoadingState from '@/components/ui/LoadingState';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard({ tasks = [], isLoading = false, onTaskMove }) {
  const todoTasks = tasks.filter((task) => task.status === 'TO_DO');
  const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((task) => task.status === 'DONE');

  const columns = [
    { id: 'TO_DO', title: 'To Do', tasks: todoTasks },
    { id: 'IN_PROGRESS', title: 'In Progress', tasks: inProgressTasks },
    { id: 'DONE', title: 'Done', tasks: doneTasks },
  ];

  if (isLoading) {
    return <LoadingState message="Loading tasks..." />;
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-center text-slate-400 dark:text-slate-500 py-10">
        No tasks available yet. Generate tasks using the AI Planner.
      </p>
    );
  }

  const handleTaskMove = onTaskMove ?? ((taskId, newStatus) => {
    console.log('Move task', taskId, 'to', newStatus);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          title={column.title}
          tasks={column.tasks}
          onTaskMove={handleTaskMove}
        />
      ))}
    </div>
  );
}
