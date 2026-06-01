import React from 'react';
import TaskCard from './TaskCard';

const KanbanColumn = ({ title, tasks, onTaskMove }) => {
  return (
    <div className="kanban-column">
      <h3>{title}</h3>
      <div className="tasks-container">
        {tasks && tasks.map((task) => (
          <TaskCard key={task.id} task={task} onMove={onTaskMove} />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
