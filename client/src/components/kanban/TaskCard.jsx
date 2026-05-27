import React from 'react';

const TaskCard = ({ task, onMove }) => {
  return (
    <div className="task-card" draggable>
      <h4>{task.title}</h4>
      <p>{task.description}</p>
      <div className="task-footer">
        {/* Task metadata */}
      </div>
    </div>
  );
};

export default TaskCard;
