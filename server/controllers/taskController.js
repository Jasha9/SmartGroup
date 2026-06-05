const pool = require('../db/db');

// GET /api/tasks?groupId=<id>
async function getTasks(req, res) {
  const { groupId } = req.query;
  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }
  try {
    const result = await pool.query(
      `SELECT t.task_id, t.group_id, t.title, t.description, t.status, t.priority,
              t.effort_hours, t.is_signed, t.due_date, t.created_at,
              u.full_name AS assigned_to_name, u.email AS assigned_to_email
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.user_id
       WHERE t.group_id = $1
         AND t.status IN ('TO_DO', 'IN_PROGRESS', 'DONE')
       ORDER BY t.created_at ASC`,
      [groupId]
    );
    return res.json({ success: true, data: { tasks: result.rows } });
  } catch (err) {
    console.error('[getTasks]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch tasks.' });
  }
}

// POST /api/tasks  — bulk save AI-generated tasks
async function createTasks(req, res) {
  const { groupId, groupName, tasks = [] } = req.body;
  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saved = [];

    for (const t of tasks) {
      // Resolve assigned_to email → user_id (best-effort)
      let assignedUserId = null;
      if (t.assigned_to_email) {
        const userRes = await client.query(
          `SELECT user_id FROM users WHERE email = $1`,
          [t.assigned_to_email.trim().toLowerCase()]
        );
        if (userRes.rows.length > 0) assignedUserId = userRes.rows[0].user_id;
      }

      const taskRes = await client.query(
        `INSERT INTO tasks (group_id, title, description, priority, status, assigned_to, due_date)
         VALUES ($1, $2, $3, $4, 'TO_DO', $5, $6)
         RETURNING *`,
        [
          groupId,
          t.title,
          t.description || '',
          (t.priority || 'MEDIUM').toUpperCase(),
          assignedUserId,
          t.due_date || null,
        ]
      );
      const newTask = taskRes.rows[0];
      saved.push(newTask);

      // Notify assignee if resolved
      if (assignedUserId) {
        await client.query(
          `INSERT INTO notifications (user_id, group_id, message, type, is_read)
           VALUES ($1, $2, $3, 'TASK_ASSIGNED', false)`,
          [assignedUserId, groupId, `You have been assigned a new task: ${newTask.title}`]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { saved: saved.length, tasks: saved } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[createTasks]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save tasks.' });
  } finally {
    client.release();
  }
}

// POST /api/tasks/bulk — bulk create assigned tasks with PENDING_ACCEPTANCE status
async function bulkSaveTasks(req, res) {
  const { groupId, tasks = [] } = req.body;
  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ success: false, error: 'tasks array is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(`SELECT group_id FROM groups WHERE group_id = $1`, [groupId]);
    if (groupResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const saved = [];
    for (const task of tasks) {
      if (!task.title || !task.title.trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Each task requires a title.' });
      }

      let assignedTo = null;
      if (task.assigned_to) {
        const assignedUser = await client.query(
          `SELECT user_id FROM users WHERE user_id = $1`,
          [task.assigned_to]
        );
        if (assignedUser.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, error: `Assigned user not found: ${task.assigned_to}` });
        }
        assignedTo = assignedUser.rows[0].user_id;
      }

      const taskRes = await client.query(
        `INSERT INTO tasks (group_id, title, description, priority, status, effort_hours, assigned_to)
         VALUES ($1, $2, $3, $4, 'PENDING_ACCEPTANCE', $5, $6)
         RETURNING task_id, group_id, title, description, status, priority, effort_hours, assigned_to, due_date, is_signed, created_at`,
        [
          groupId,
          task.title.trim(),
          task.description || '',
          (task.priority || 'MEDIUM').toUpperCase(),
          task.estimated_hours || null,
          assignedTo,
        ]
      );

      const newTask = taskRes.rows[0];
      saved.push(newTask);

      if (assignedTo) {
        await client.query(
          `INSERT INTO notifications (user_id, group_id, message, type, is_read)
           VALUES ($1, $2, $3, 'TASK_ASSIGNED', false)`,
          [assignedTo, groupId, `You have been assigned a new task: ${newTask.title}`]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { saved: saved.length, tasks: saved } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[bulkSaveTasks]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save bulk tasks.' });
  } finally {
    client.release();
  }
}

// PATCH /api/tasks/:taskId
async function updateTask(req, res) {
  const { taskId } = req.params;
  const { title, description, status, priority, assigned_to_email, due_date } = req.body;
  const userId = req.user.user_id;

  if (!taskId) {
    return res.status(400).json({ success: false, error: 'Task ID is required.' });
  }

  try {
    let assignedUserId = null;
    if (assigned_to_email) {
      const userRes = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [assigned_to_email.trim().toLowerCase()]);
      if (userRes.rows.length > 0) {
        assignedUserId = userRes.rows[0].user_id;
      }
    }

    const updateQuery = `
      UPDATE tasks
      SET title = COALESCE(NULLIF($1, ''), title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          assigned_to = CASE WHEN $5 IS NOT NULL THEN $5 ELSE assigned_to END,
          due_date = $6
      WHERE task_id = $7
      RETURNING *`;

    const taskResult = await pool.query(updateQuery, [
      title,
      description,
      status,
      priority ? priority.toUpperCase() : null,
      assignedUserId,
      due_date || null,
      taskId,
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    return res.json({ success: true, data: { task: taskResult.rows[0] } });
  } catch (err) {
    console.error('[updateTask]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update task.' });
  }
}

module.exports = { getTasks, createTasks, bulkSaveTasks, updateTask };
