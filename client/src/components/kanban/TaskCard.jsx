import React from 'react';

const TaskCard = ({ task, onMove }) => {
  return (
    <div className="task-card" draggable>
      <h4>{task.title}</h4>
      <p className="text-sm text-gray-600">Assigned to {task.assignee}</p>
      <div className="task-footer mt-2 flex justify-between text-xs text-gray-500">
        <span>Priority: {task.priority}</span>
        <span>Status: {task.status.replace('_', ' ')}</span>
      </div>
    </div>
  );
};

export default TaskCard;
