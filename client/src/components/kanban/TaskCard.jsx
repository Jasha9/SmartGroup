import React from 'react';

const TaskCard = ({ task, onMove }) => {
  const taskId = task.task_id || task.id;
  const options = [];
  if (task.status === 'TO_DO') {
    options.push({ label: 'Move to In Progress', status: 'IN_PROGRESS' });
    options.push({ label: 'Move to Done', status: 'DONE' });
  } else if (task.status === 'IN_PROGRESS') {
    options.push({ label: 'Move to Done', status: 'DONE' });
  }

  return (
    <div className="task-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-900">{task.title}</h4>
          <p className="text-xs text-slate-500 mt-1">Assigned to {task.assigned_to_name || task.assigned_to || 'Unassigned'}</p>
        </div>
        <span className="text-[11px] font-semibold uppercase text-slate-500">{task.status.replace('_', ' ')}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option.status}
            type="button"
            onClick={() => onMove(taskId, option.status)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskCard;
