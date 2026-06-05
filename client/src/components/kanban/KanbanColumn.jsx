import React from 'react';
import TaskCard from './TaskCard';

const KanbanColumn = ({ title, tasks, onTaskMove }) => {
  return (
    <div className="kanban-column">
      <h3>{title}</h3>
      <div className="tasks-container">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard key={task.task_id || task.id} task={task} onMove={onTaskMove} />
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No accepted tasks yet. Accept assigned responsibilities to begin.
          </p>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
