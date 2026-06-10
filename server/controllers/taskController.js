const pool = require('../db/db');

const ACCEPTED_TASK_STATUSES = ['TO_DO', 'IN_PROGRESS', 'DONE', 'NEGOTIATING', 'CHANGE_REQUESTED', 'PENDING_ACCEPTANCE'];

function buildTaskSelectClause() {
  return `SELECT t.task_id, t.group_id, t.assessment_id,
              a.title AS assessment_title, a.description AS assessment_description, a.due_date AS assessment_due_date,
              t.title, t.description, t.status, t.priority,
              t.effort_hours, t.is_signed, t.due_date, t.created_at, t.updated_at,
              u.full_name AS assigned_to_name, u.email AS assigned_to_email,
              g.group_name AS group_name
       FROM tasks t
       LEFT JOIN assessments a ON t.assessment_id = a.assessment_id
       LEFT JOIN users u ON t.assigned_to = u.user_id
       LEFT JOIN groups g ON t.group_id = g.group_id`;
}

function buildTaskRowFilter({ groupId, assessmentId, assignedUserId, includeAcceptedOnly = false }) {
  const where = [];
  const values = [];

  if (groupId) {
    values.push(groupId);
    where.push(`t.group_id = $${values.length}`);
  }

  if (assessmentId) {
    values.push(assessmentId);
    where.push(`t.assessment_id = $${values.length}`);
  }

  if (assignedUserId) {
    values.push(assignedUserId);
    where.push(`t.assigned_to = $${values.length}`);
  }

  if (includeAcceptedOnly) {
    where.push(`EXISTS (
      SELECT 1 FROM charters c
      WHERE c.task_id = t.task_id
        AND (c.status = 'ACCEPTED' OR c.is_signed = true)
    )`);
  }

  return { where, values };
}

async function resolveAssessment(client, { groupId, assessmentId, assessmentTitle, assessmentDescription, assessmentDueDate, createdBy }) {
  if (assessmentId) {
    const existing = await client.query(
      `SELECT assessment_id, group_id, title, description, due_date, created_by, created_at
       FROM assessments
       WHERE assessment_id = $1 AND group_id = $2`,
      [assessmentId, groupId]
    );

    if (existing.rowCount === 0) {
      throw new Error('Assessment not found for this group.');
    }

    return existing.rows[0];
  }

  if (!assessmentTitle || !assessmentTitle.trim()) {
    return null;
  }

  const inserted = await client.query(
    `INSERT INTO assessments (group_id, title, description, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING assessment_id, group_id, title, description, due_date, created_by, created_at`,
    [
      groupId,
      assessmentTitle.trim(),
      assessmentDescription?.trim() || '',
      assessmentDueDate || null,
      createdBy || null,
    ]
  );

  return inserted.rows[0];
}

// GET /api/tasks?groupId=<id>&assessmentId=<id>&assignedUserId=<id>
async function getTasks(req, res) {
  const { groupId, assessmentId, assignedUserId } = req.query;
  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }

  try {
    const { where, values } = buildTaskRowFilter({
      groupId,
      assessmentId,
      assignedUserId,
      includeAcceptedOnly: true,
    });

    const query = `${buildTaskSelectClause()}
       WHERE ${where.join(' AND ')}
       ORDER BY t.created_at ASC`;

    const result = await pool.query(query, values);
    return res.json({ success: true, data: { tasks: result.rows } });
  } catch (err) {
    console.error('[getTasks]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch tasks.' });
  }
}

// GET /api/tasks/my-tasks
async function getMyTasks(req, res) {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `${buildTaskSelectClause()}
       WHERE t.assigned_to = $1
       ORDER BY CASE WHEN t.status = 'NEGOTIATING' OR t.status = 'CHANGE_REQUESTED' THEN 0 ELSE 1 END,
                COALESCE(t.updated_at, t.created_at) DESC`,
      [userId]
    );

    return res.json({ success: true, data: { tasks: result.rows } });
  } catch (err) {
    console.error('[getMyTasks]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch your tasks.' });
  }
}

async function assertTaskAccess(taskId, userId) {
  const taskRes = await pool.query(
    `SELECT task_id, group_id, assigned_to, title FROM tasks WHERE task_id = $1`,
    [taskId]
  );

  if (taskRes.rowCount === 0) {
    return null;
  }

  const task = taskRes.rows[0];
  const accessRes = await pool.query(
    `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
    [task.group_id, userId]
  );

  if (accessRes.rowCount === 0 && task.assigned_to !== userId) {
    return false;
  }

  return task;
}

// GET /api/tasks/:taskId/comments
async function getTaskComments(req, res) {
  const { taskId } = req.params;
  const userId = req.user.user_id;

  try {
    const task = await assertTaskAccess(taskId, userId);
    if (task === null) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    if (task === false) {
      return res.status(403).json({ success: false, error: 'Access denied to task comments.' });
    }

    const result = await pool.query(
      `SELECT tc.comment_id, tc.task_id, tc.user_id, tc.comment_text, tc.created_at,
              u.full_name, u.email
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.user_id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    return res.json({ success: true, data: { comments: result.rows } });
  } catch (err) {
    console.error('[getTaskComments]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch comments.' });
  }
}

// POST /api/tasks/:taskId/comments
async function addTaskComment(req, res) {
  const { taskId } = req.params;
  const { comment_text } = req.body;
  const userId = req.user.user_id;

  const text = String(comment_text || '').trim();
  if (!text) {
    return res.status(400).json({ success: false, error: 'comment_text is required.' });
  }

  try {
    const task = await assertTaskAccess(taskId, userId);
    if (task === null) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    if (task === false) {
      return res.status(403).json({ success: false, error: 'Access denied to task comments.' });
    }

    const inserted = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, comment_text)
       VALUES ($1, $2, $3)
       RETURNING comment_id, task_id, user_id, comment_text, created_at`,
      [taskId, userId, text]
    );

    const userRes = await pool.query(
      `SELECT full_name, email FROM users WHERE user_id = $1`,
      [userId]
    );

    return res.status(201).json({
      success: true,
      data: {
        comment: {
          ...inserted.rows[0],
          full_name: userRes.rows[0]?.full_name || null,
          email: userRes.rows[0]?.email || null,
        },
      },
    });
  } catch (err) {
    console.error('[addTaskComment]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add comment.' });
  }
}

// POST /api/tasks  — bulk save AI-generated tasks
async function createTasks(req, res) {
  const {
    groupId,
    groupName,
    tasks = [],
    assessmentId,
    assessmentTitle,
    assessmentDescription,
    assessmentDueDate,
  } = req.body;

  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const assessment = await resolveAssessment(client, {
      groupId,
      assessmentId,
      assessmentTitle,
      assessmentDescription,
      assessmentDueDate,
      createdBy: req.user.user_id,
    });

    const saved = [];

    for (const t of tasks) {
      let assignedUserId = null;
      if (t.assigned_to_email) {
        const userRes = await client.query(
          `SELECT user_id FROM users WHERE email = $1`,
          [String(t.assigned_to_email).trim().toLowerCase()]
        );
        if (userRes.rows.length > 0) assignedUserId = userRes.rows[0].user_id;
      }

      const taskRes = await client.query(
        `INSERT INTO tasks (group_id, assessment_id, title, description, priority, status, assigned_to, due_date)
         VALUES ($1, $2, $3, $4, $5, 'TO_DO', $6, $7)
         RETURNING *`,
        [
          groupId,
          assessment?.assessment_id || null,
          t.title,
          t.description || '',
          (t.priority || 'MEDIUM').toUpperCase(),
          assignedUserId,
          t.due_date || null,
        ]
      );
      const newTask = taskRes.rows[0];
      saved.push(newTask);

      if (assignedUserId) {
        await client.query(
          `INSERT INTO charters (user_id, group_id, task_id, status, is_signed)
           VALUES ($1, $2, $3, 'PENDING_ACCEPTANCE', false)`,
          [assignedUserId, groupId, newTask.task_id]
        );

        await client.query(
          `INSERT INTO notifications (user_id, group_id, task_id, message, type, is_read)
           VALUES ($1, $2, $3, $4, 'TASK_ASSIGNED', false)` ,
          [assignedUserId, groupId, newTask.task_id, `You have been assigned a new task: ${newTask.title}`]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { saved: saved.length, tasks: saved, assessment, groupName } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[createTasks]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save tasks.' });
  } finally {
    client.release();
  }
}

// POST /api/tasks/bulk — bulk create assigned tasks with PENDING_ACCEPTANCE status
async function bulkSaveTasks(req, res) {
  const {
    groupId,
    tasks = [],
    assessmentId,
    assessmentTitle,
    assessmentDescription,
    assessmentDueDate,
  } = req.body;

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

    const assessment = await resolveAssessment(client, {
      groupId,
      assessmentId,
      assessmentTitle,
      assessmentDescription,
      assessmentDueDate,
      createdBy: req.user.user_id,
    });

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
      } else if (task.assigned_to_email) {
        const assignedUser = await client.query(
          `SELECT user_id FROM users WHERE lower(email) = lower($1)` ,
          [String(task.assigned_to_email).trim()]
        );
        if (assignedUser.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, error: `Assigned user not found for email: ${task.assigned_to_email}` });
        }
        assignedTo = assignedUser.rows[0].user_id;
      }

      const taskRes = await client.query(
        `INSERT INTO tasks (group_id, assessment_id, title, description, priority, status, effort_hours, assigned_to)
         VALUES ($1, $2, $3, $4, $5, 'PENDING_ACCEPTANCE', $6, $7)
         RETURNING task_id, group_id, assessment_id, title, description, status, priority, effort_hours, assigned_to, due_date, is_signed, created_at`,
        [
          groupId,
          assessment?.assessment_id || null,
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
          `INSERT INTO charters (user_id, group_id, task_id, status, is_signed)
           VALUES ($1, $2, $3, 'PENDING_ACCEPTANCE', false)`,
          [assignedTo, groupId, newTask.task_id]
        );

        await client.query(
          `INSERT INTO notifications (user_id, group_id, task_id, message, type, is_read)
           VALUES ($1, $2, $3, $4, 'TASK_ASSIGNED', false)`,
          [assignedTo, groupId, newTask.task_id, `You have been assigned a new task: ${newTask.title}`]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { saved: saved.length, tasks: saved, assessment } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[bulkSaveTasks]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save bulk tasks.' });
  } finally {
    client.release();
  }
}

// PATCH /api/tasks/:taskId
async function updateTask(req, res) {
  const { taskId } = req.params;
  const { title, description, status, priority, assigned_to_email, due_date, assessment_id } = req.body;

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
          due_date = $6,
          assessment_id = COALESCE($7, assessment_id),
          updated_at = NOW()
      WHERE task_id = $8
      RETURNING *`;

    const taskResult = await pool.query(updateQuery, [
      title,
      description,
      status,
      priority ? priority.toUpperCase() : null,
      assignedUserId,
      due_date || null,
      assessment_id || null,
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

// PATCH /api/tasks/:taskId/status
async function updateTaskStatus(req, res) {
  const { taskId } = req.params;
  const { status } = req.body;
  if (!taskId) {
    return res.status(400).json({ success: false, error: 'Task ID is required.' });
  }
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required.' });
  }
  const normalizedStatus = status.toUpperCase();
  if (!ACCEPTED_TASK_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }
  try {
    const taskResult = await pool.query(
      `UPDATE tasks
       SET status = $1, updated_at = NOW()
       WHERE task_id = $2
       RETURNING *`,
      [normalizedStatus, taskId]
    );
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    return res.json({ success: true, data: { task: taskResult.rows[0] } });
  } catch (err) {
    console.error('[updateTaskStatus]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update task status.' });
  }
}

module.exports = {
  getTasks,
  getMyTasks,
  getTaskComments,
  addTaskComment,
  createTasks,
  bulkSaveTasks,
  updateTask,
  updateTaskStatus,
};
