import React from 'react';
import LoadingState from '@/components/ui/LoadingState';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard() {
  const isLoading = false;
  const tasks = [
    {
      id: 1,
      title: 'Set up backend',
      assignee: 'Dilraj',
      status: 'TO_DO',
      priority: 'High',
    },
    {
      id: 2,
      title: 'Build Kanban UI',
      assignee: 'Khushi',
      status: 'IN_PROGRESS',
      priority: 'Medium',
    },
    {
      id: 3,
      title: 'Connect AI Planner API',
      assignee: 'Jashandeep',
      status: 'DONE',
      priority: 'High',
    },
  ];

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

  const handleTaskMove = (taskId, newStatus) => {
    // placeholder for future backend integration or drag/drop handling
    console.log('Move task', taskId, 'to', newStatus);
  };

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
