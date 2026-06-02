const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Task routes working",
    sampleTasks: [
      {
        id: 1,
        title: "Set up backend",
        status: "TO_DO",
        assigned_to: "Dilraj",
      },
    ],
  });
});

// POST /api/tasks  — save AI-generated tasks and notify assignees by email
router.post("/", async (req, res) => {
  const { groupId, groupName, tasks = [] } = req.body;

  if (!groupId) {
    return res.status(400).json({ error: 'groupId is required.' });
  }

  // TODO (Dilraj): replace stub with real DB insert into tasks table
  const savedTasks = tasks.map((t, i) => ({
    task_id: `task_${Date.now()}_${i}`,
    group_id: groupId,
    title: t.title,
    description: t.description || '',
    priority: t.priority || 'MEDIUM',
    status: 'TO_DO',
    assigned_to_email: t.assigned_to_email || null,
    due_date: t.due_date || null,
    created_at: new Date().toISOString(),
  }));

  res.status(201).json({
    saved: savedTasks.length,
    tasks: savedTasks,
    notifications: savedTasks.map((t) => ({
      type: 'TASK_ASSIGNED',
      message: `You have been assigned: "${t.title}"`,
      task_id: t.task_id,
      is_read: false,
    })),
  });
});

module.exports = router;
