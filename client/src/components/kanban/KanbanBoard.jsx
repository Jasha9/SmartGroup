export default function KanbanBoard() {
  const columns = ["To Do", "In Progress", "Done"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {columns.map((column) => (
        <div key={column} className="bg-gray-100 rounded-xl p-4 min-h-[300px]">
          <h2 className="font-semibold text-lg mb-4">{column}</h2>

          <div className="bg-white rounded-lg p-3 shadow mb-3">
            <h3 className="font-medium">Sample Task</h3>
            <p className="text-sm text-gray-600">Assigned to team member</p>
          </div>
        </div>
      ))}
    </div>
  );
}
