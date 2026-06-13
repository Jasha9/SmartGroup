const pool = require('../db/db');

const ACCEPTED_TASK_STATUSES = ['TO_DO', 'IN_PROGRESS', 'DONE', 'NEGOTIATING', 'CHANGE_REQUESTED', 'PENDING_ACCEPTANCE'];
const NEGOTIATION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'];
const MAX_WORKLOAD_VARIANCE_HOURS = 2;

function buildTaskSelectClause() {
  return `SELECT t.task_id, t.group_id, t.assessment_id,
              a.title AS assessment_title, a.description AS assessment_description, a.due_date AS assessment_due_date,
              t.title, t.description, t.status, t.priority,
              t.effort_hours, t.is_signed, t.due_date, t.created_at, t.updated_at,
              u.full_name AS assigned_to_name, u.email AS assigned_to_email,
              g.group_name,
              COALESCE(sa.subtask_total, 0) AS subtask_total,
              COALESCE(sa.subtask_completed, 0) AS subtask_completed,
              CASE
                WHEN COALESCE(sa.subtask_total, 0) > 0
                  THEN ROUND((sa.subtask_completed::numeric * 100.0) / sa.subtask_total)::INT
                ELSE COALESCE(t.progress_percentage, 0)
              END AS progress_percentage
       FROM tasks t
       LEFT JOIN assessments a ON t.assessment_id = a.assessment_id
       LEFT JOIN users u ON t.assigned_to = u.user_id
       LEFT JOIN groups g ON t.group_id = g.group_id
       LEFT JOIN (
         SELECT st.task_id,
                COUNT(*)::INT AS subtask_total,
                COUNT(*) FILTER (WHERE st.is_completed = true)::INT AS subtask_completed
         FROM subtasks st
         GROUP BY st.task_id
       ) sa ON sa.task_id = t.task_id`;
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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function extractMentions(commentText) {
  const matches = String(commentText || '').matchAll(/@([a-zA-Z0-9._%+-]+(?:@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})?)/g);
  return Array.from(matches).map((match) => normalizeText(match[1]));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function groupTasksByAssessment(tasks) {
  const grouped = new Map();

  for (const task of tasks) {
    const assessmentId = task.assessment_id || 'unassigned-assessment';
    const groupId = task.group_id || 'unknown-group';
    const key = `${assessmentId}::${groupId}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        assessment_id: task.assessment_id || 'unassigned-assessment',
        assessment_title: task.assessment_title || 'Unassigned Assessment',
        group_id: task.group_id,
        group_name: task.group_name || 'Unknown Group',
        due_date: task.assessment_due_date || null,
        tasks: [],
      });
    }

    grouped.get(key).tasks.push(task);
  }

  return Array.from(grouped.values());
}

function normalizeTaskHours(task) {
  const value = Number(task?.estimated_hours ?? task?.effort_hours ?? 1);
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(8, Math.round(value)));
}

function evaluateWorkloadBalance(tasks, memberEmails) {
  const totalsByEmail = new Map(memberEmails.map((email) => [String(email).trim().toLowerCase(), 0]));

  for (const task of tasks) {
    const email = String(task?.assigned_to_email || '').trim().toLowerCase();
    if (!email || !totalsByEmail.has(email)) continue;
    totalsByEmail.set(email, totalsByEmail.get(email) + normalizeTaskHours(task));
  }

  const totals = Array.from(totalsByEmail.values());
  if (totals.length === 0) {
    return { isBalanced: true, maxHours: 0, minHours: 0, varianceHours: 0, totalsByEmail };
  }

  const maxHours = Math.max(...totals);
  const minHours = Math.min(...totals);
  const varianceHours = maxHours - minHours;

  return {
    isBalanced: varianceHours <= MAX_WORKLOAD_VARIANCE_HOURS,
    maxHours,
    minHours,
    varianceHours,
    totalsByEmail,
  };
}

async function syncTaskProgress(client, taskId) {
  const countRes = await client.query(
    `SELECT COUNT(*)::INT AS total,
            COUNT(*) FILTER (WHERE is_completed = true)::INT AS completed
     FROM subtasks
     WHERE task_id = $1`,
    [taskId]
  );

  const total = countRes.rows[0]?.total || 0;
  const completed = countRes.rows[0]?.completed || 0;
  const progress = total > 0 ? Math.round((completed * 100) / total) : 0;

  await client.query(
    `UPDATE tasks
     SET progress_percentage = $1,
         updated_at = NOW()
     WHERE task_id = $2`,
    [progress, taskId]
  );

  return { total, completed, progress };
}

async function insertNotifications(client, { recipients, type, title, message, relatedTaskId = null, relatedGroupId = null, relatedAssessmentId = null }) {
  if (!Array.isArray(recipients) || recipients.length === 0) return;

  const values = [];
  const placeholders = recipients.map((userId, index) => {
    const base = index * 10;
    values.push(
      userId,
      type,
      title,
      message,
      relatedGroupId,
      relatedTaskId,
      relatedTaskId,
      relatedGroupId,
      relatedAssessmentId,
      false
    );

    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
  });

  await client.query(
    `INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      group_id,
      task_id,
      related_task_id,
      related_group_id,
      related_assessment_id,
      is_read
    ) VALUES ${placeholders.join(', ')}`,
    values
  );
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

async function assertTaskAccess(taskId, userId) {
  const taskRes = await pool.query(
    `SELECT t.task_id, t.group_id, t.assigned_to, t.title, t.assessment_id, m.role AS membership_role
     FROM tasks t
     LEFT JOIN memberships m ON m.group_id = t.group_id AND m.user_id = $2
     WHERE t.task_id = $1`,
    [taskId, userId]
  );

  if (taskRes.rowCount === 0) return null;

  const task = taskRes.rows[0];
  const isAssignee = task.assigned_to === userId;
  const isMember = Boolean(task.membership_role);

  if (!isMember && !isAssignee) return false;

  return task;
}

function canEditTask(task, userId) {
  const role = String(task.membership_role || '').toUpperCase();
  return task.assigned_to === userId || role === 'OWNER';
}

async function findMentionedUsers(client, task, commentText, authorUserId) {
  const mentionTokens = extractMentions(commentText);
  if (mentionTokens.length === 0) return [];

  const membersRes = await client.query(
    `SELECT u.user_id, u.full_name, u.email
     FROM memberships m
     JOIN users u ON m.user_id = u.user_id
     WHERE m.group_id = $1`,
    [task.group_id]
  );

  const aliasMap = new Map();

  for (const member of membersRes.rows) {
    const aliases = new Set();
    const email = normalizeText(member.email);
    const name = normalizeText(member.full_name);

    if (email) {
      aliases.add(email);
      aliases.add(email.split('@')[0]);
    }

    if (name) {
      aliases.add(name);
      aliases.add(name.replace(/\s+/g, ''));
      name.split(/\s+/).forEach((part) => aliases.add(part));
    }

    for (const alias of aliases) {
      if (!alias) continue;
      if (!aliasMap.has(alias)) aliasMap.set(alias, new Set());
      aliasMap.get(alias).add(member.user_id);
    }
  }

  const mentioned = new Set();
  for (const token of mentionTokens) {
    const matches = aliasMap.get(token);
    if (!matches) continue;
    for (const uid of matches.values()) {
      if (uid !== authorUserId) mentioned.add(uid);
    }
  }

  return Array.from(mentioned);
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

    const grouped = groupTasksByAssessment(result.rows);

    return res.json({
      success: true,
      data: grouped,
      tasks: result.rows,
    });
  } catch (err) {
    console.error('[getMyTasks]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch your tasks.' });
  }
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
              u.full_name, u.email,
              COALESCE(mentions.mentioned_user_ids, '[]'::json) AS mentioned_user_ids
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.user_id
       LEFT JOIN LATERAL (
         SELECT json_agg(cm.mentioned_user_id) AS mentioned_user_ids
         FROM comment_mentions cm
         WHERE cm.comment_id = tc.comment_id
       ) mentions ON true
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taskAccess = await assertTaskAccess(taskId, userId);
    if (taskAccess === null) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    if (taskAccess === false) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Access denied to task comments.' });
    }

    const inserted = await client.query(
      `INSERT INTO task_comments (task_id, user_id, comment_text)
       VALUES ($1, $2, $3)
       RETURNING comment_id, task_id, user_id, comment_text, created_at`,
      [taskId, userId, text]
    );

    const userRes = await client.query(
      `SELECT full_name, email FROM users WHERE user_id = $1`,
      [userId]
    );

    const mentionedUserIds = await findMentionedUsers(client, taskAccess, text, userId);

    for (const mentionedUserId of mentionedUserIds) {
      await client.query(
        `INSERT INTO comment_mentions (comment_id, mentioned_user_id)
         VALUES ($1, $2)
         ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING`,
        [inserted.rows[0].comment_id, mentionedUserId]
      );
    }

    const commenterName = userRes.rows[0]?.full_name || userRes.rows[0]?.email || 'A teammate';
    await insertNotifications(client, {
      recipients: mentionedUserIds,
      type: 'COMMENT_MENTION',
      title: 'Mentioned In Comment',
      message: `${commenterName} mentioned you in a comment on task: ${taskAccess.title}`,
      relatedTaskId: taskId,
      relatedGroupId: taskAccess.group_id,
      relatedAssessmentId: taskAccess.assessment_id,
    });

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        comment: {
          ...inserted.rows[0],
          full_name: userRes.rows[0]?.full_name || null,
          email: userRes.rows[0]?.email || null,
          mentioned_user_ids: mentionedUserIds,
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[addTaskComment]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add comment.' });
  } finally {
    client.release();
  }
}

// GET /api/tasks/:taskId/subtasks
async function getTaskSubtasks(req, res) {
  const { taskId } = req.params;
  const userId = req.user.user_id;

  try {
    const task = await assertTaskAccess(taskId, userId);
    if (task === null) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    if (task === false) {
      return res.status(403).json({ success: false, error: 'Access denied to subtasks.' });
    }

    const result = await pool.query(
      `SELECT st.subtask_id, st.task_id, st.title, st.is_completed, st.created_by, st.created_at, st.updated_at,
              u.full_name AS created_by_name, u.email AS created_by_email
       FROM subtasks st
       LEFT JOIN users u ON u.user_id = st.created_by
       WHERE st.task_id = $1
       ORDER BY st.created_at ASC`,
      [taskId]
    );

    return res.json({ success: true, data: { subtasks: result.rows } });
  } catch (err) {
    console.error('[getTaskSubtasks]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch subtasks.' });
  }
}

// POST /api/tasks/:taskId/subtasks
async function addTaskSubtask(req, res) {
  const { taskId } = req.params;
  const userId = req.user.user_id;
  const title = String(req.body?.title || '').trim();

  if (!title) {
    return res.status(400).json({ success: false, error: 'title is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const task = await assertTaskAccess(taskId, userId);
    if (task === null) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    if (task === false || !canEditTask(task, userId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Only the assignee or group owner can add subtasks.' });
    }

    const inserted = await client.query(
      `INSERT INTO subtasks (task_id, title, created_by)
       VALUES ($1, $2, $3)
       RETURNING subtask_id, task_id, title, is_completed, created_by, created_at, updated_at`,
      [taskId, title, userId]
    );

    const progress = await syncTaskProgress(client, taskId);

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { subtask: inserted.rows[0], progress } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[addTaskSubtask]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add subtask.' });
  } finally {
    client.release();
  }
}

// PATCH /api/tasks/:taskId/subtasks/:subtaskId
async function updateTaskSubtask(req, res) {
  const { taskId, subtaskId } = req.params;
  const userId = req.user.user_id;
  const { is_completed, title } = req.body;

  if (typeof is_completed === 'undefined' && typeof title === 'undefined') {
    return res.status(400).json({ success: false, error: 'Provide is_completed or title.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const task = await assertTaskAccess(taskId, userId);
    if (task === null) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    if (task === false || !canEditTask(task, userId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Only the assignee or group owner can update subtasks.' });
    }

    const updated = await client.query(
      `UPDATE subtasks
       SET title = COALESCE(NULLIF($1, ''), title),
           is_completed = COALESCE($2, is_completed),
           updated_at = NOW()
       WHERE subtask_id = $3 AND task_id = $4
       RETURNING subtask_id, task_id, title, is_completed, created_by, created_at, updated_at`,
      [title, typeof is_completed === 'boolean' ? is_completed : null, subtaskId, taskId]
    );

    if (updated.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Subtask not found.' });
    }

    const progress = await syncTaskProgress(client, taskId);

    await client.query('COMMIT');
    return res.json({ success: true, data: { subtask: updated.rows[0], progress } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[updateTaskSubtask]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update subtask.' });
  } finally {
    client.release();
  }
}

// POST /api/tasks/:taskId/request-change
async function requestTaskChange(req, res) {
  const { taskId } = req.params;
  const { requested_to, reason } = req.body;
  const userId = req.user.user_id;
  const requestedTo = String(requested_to || '').trim();

  const normalizedReason = String(reason || '').trim();
  if (!requestedTo) {
    return res.status(400).json({ success: false, error: 'requested_to is required.' });
  }
  if (!isUuid(requestedTo)) {
    return res.status(400).json({ success: false, error: 'requested_to must be a valid user id.' });
  }
  if (!normalizedReason) {
    return res.status(400).json({ success: false, error: 'reason is required.' });
  }
  if (requestedTo === userId) {
    return res.status(400).json({ success: false, error: 'You cannot request a change with yourself.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const task = await assertTaskAccess(taskId, userId);
    if (task === null) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }
    if (task === false || task.assigned_to !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Only the current assignee can request a change.' });
    }

    const targetMember = await client.query(
      `SELECT u.user_id
       FROM memberships m
       JOIN users u ON u.user_id = m.user_id
       WHERE m.group_id = $1 AND u.user_id = $2`,
      [task.group_id, requestedTo]
    );

    if (targetMember.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Requested member must be in the same group.' });
    }

    const pendingExisting = await client.query(
      `SELECT negotiation_id
       FROM task_negotiations
       WHERE task_id = $1 AND requested_by = $2 AND status = 'PENDING'`,
      [taskId, userId]
    );

    if (pendingExisting.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'A pending change request already exists for this task.' });
    }

    const inserted = await client.query(
      `INSERT INTO task_negotiations (task_id, requested_by, requested_to, reason, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING negotiation_id, task_id, requested_by, requested_to, reason, status, created_at, resolved_at`,
      [taskId, userId, requestedTo, normalizedReason]
    );

    await client.query(
      `UPDATE tasks
       SET status = 'CHANGE_REQUESTED', updated_at = NOW()
       WHERE task_id = $1`,
      [taskId]
    );

    const requesterRes = await client.query(
      `SELECT full_name, email FROM users WHERE user_id = $1`,
      [userId]
    );

    const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || 'A teammate';

    await insertNotifications(client, {
      recipients: [requestedTo],
      type: 'TASK_CHANGE_REQUEST',
      title: 'Request Change',
      message: `${requesterName} requested to swap/change task: ${task.title}`,
      relatedTaskId: taskId,
      relatedGroupId: task.group_id,
      relatedAssessmentId: task.assessment_id,
    });

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { request: inserted.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[requestTaskChange]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to request task change.' });
  } finally {
    client.release();
  }
}

// GET /api/tasks/change-requests
async function getTaskChangeRequests(req, res) {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT tn.negotiation_id, tn.task_id, tn.requested_by, tn.requested_to, tn.reason, tn.status, tn.created_at, tn.resolved_at,
              t.title AS task_title, t.group_id, t.assessment_id,
              rb.full_name AS requested_by_name, rb.email AS requested_by_email,
              rt.full_name AS requested_to_name, rt.email AS requested_to_email,
              g.group_name, a.title AS assessment_title
       FROM task_negotiations tn
       JOIN tasks t ON t.task_id = tn.task_id
       LEFT JOIN groups g ON g.group_id = t.group_id
       LEFT JOIN assessments a ON a.assessment_id = t.assessment_id
       LEFT JOIN users rb ON rb.user_id = tn.requested_by
       LEFT JOIN users rt ON rt.user_id = tn.requested_to
       WHERE tn.requested_by = $1 OR tn.requested_to = $1
       ORDER BY CASE WHEN tn.status = 'PENDING' THEN 0 ELSE 1 END, tn.created_at DESC`,
      [userId]
    );

    return res.json({ success: true, data: { requests: result.rows } });
  } catch (err) {
    console.error('[getTaskChangeRequests]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch task change requests.' });
  }
}

async function resolveTaskChangeRequest(req, res, status) {
  const { id } = req.params;
  const userId = req.user.user_id;

  if (!NEGOTIATION_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status resolution.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const negotiationRes = await client.query(
      `SELECT tn.negotiation_id, tn.task_id, tn.requested_by, tn.requested_to, tn.status,
              t.group_id, t.assessment_id, t.title AS task_title
       FROM task_negotiations tn
       JOIN tasks t ON t.task_id = tn.task_id
       WHERE tn.negotiation_id = $1
         AND tn.requested_to = $2
         AND tn.status = 'PENDING'`,
      [id, userId]
    );

    if (negotiationRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Pending request not found or access denied.' });
    }

    const negotiation = negotiationRes.rows[0];

    const updatedReq = await client.query(
      `UPDATE task_negotiations
       SET status = $1,
           resolved_at = NOW()
       WHERE negotiation_id = $2
       RETURNING negotiation_id, task_id, requested_by, requested_to, reason, status, created_at, resolved_at`,
      [status, id]
    );

    if (status === 'ACCEPTED') {
      await client.query(
        `UPDATE tasks
         SET assigned_to = $1,
             status = 'TO_DO',
             updated_at = NOW()
         WHERE task_id = $2`,
        [negotiation.requested_to, negotiation.task_id]
      );

      await client.query(
        `INSERT INTO charters (user_id, group_id, task_id, status, is_signed, signed_at)
         VALUES ($1, $2, $3, 'ACCEPTED', true, NOW())`,
        [negotiation.requested_to, negotiation.group_id, negotiation.task_id]
      );

      await insertNotifications(client, {
        recipients: [negotiation.requested_by],
        type: 'TASK_CHANGE_ACCEPTED',
        title: 'Change Request Accepted',
        message: `Your request change for task "${negotiation.task_title}" was accepted.`,
        relatedTaskId: negotiation.task_id,
        relatedGroupId: negotiation.group_id,
        relatedAssessmentId: negotiation.assessment_id,
      });
    }

    if (status === 'REJECTED') {
      await client.query(
        `UPDATE tasks
         SET status = 'TO_DO', updated_at = NOW()
         WHERE task_id = $1 AND status = 'CHANGE_REQUESTED'`,
        [negotiation.task_id]
      );

      await insertNotifications(client, {
        recipients: [negotiation.requested_by],
        type: 'TASK_CHANGE_REJECTED',
        title: 'Change Request Rejected',
        message: `Your request change for task "${negotiation.task_title}" was rejected.`,
        relatedTaskId: negotiation.task_id,
        relatedGroupId: negotiation.group_id,
        relatedAssessmentId: negotiation.assessment_id,
      });
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: { request: updatedReq.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[resolveTaskChangeRequest]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to resolve task change request.' });
  } finally {
    client.release();
  }
}

// POST /api/tasks/change-requests/:id/accept
async function acceptTaskChangeRequest(req, res) {
  return resolveTaskChangeRequest(req, res, 'ACCEPTED');
}

// POST /api/tasks/change-requests/:id/reject
async function rejectTaskChangeRequest(req, res) {
  return resolveTaskChangeRequest(req, res, 'REJECTED');
}

// POST /api/tasks  â€” bulk save AI-generated tasks
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

        await insertNotifications(client, {
          recipients: [assignedUserId],
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          message: `You have been assigned a new task: ${newTask.title}`,
          relatedTaskId: newTask.task_id,
          relatedGroupId: groupId,
          relatedAssessmentId: assessment?.assessment_id || null,
        });
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

// POST /api/tasks/bulk â€” bulk create assigned tasks with PENDING_ACCEPTANCE status
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

    const memberRes = await client.query(
      `SELECT u.user_id, lower(u.email) AS email
       FROM memberships m
       JOIN users u ON u.user_id = m.user_id
       WHERE m.group_id = $1`,
      [groupId]
    );

    const membersByEmail = new Map(memberRes.rows.map((row) => [row.email, row.user_id]));
    const memberEmails = Array.from(membersByEmail.keys());

    const unassigned = tasks.filter((task) => !String(task?.assigned_to_email || '').trim());
    if (unassigned.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Assign every task to a team member before publishing.' });
    }

    const unknownAssignees = tasks
      .map((task) => String(task?.assigned_to_email || '').trim().toLowerCase())
      .filter((email) => email && !membersByEmail.has(email));

    if (unknownAssignees.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `One or more assignees are not members of this group: ${Array.from(new Set(unknownAssignees)).join(', ')}`,
      });
    }

    const workload = evaluateWorkloadBalance(tasks, memberEmails);
    if (!workload.isBalanced) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Workload is unbalanced. Maximum workload difference is ${workload.varianceHours}h. Reduce it to ${MAX_WORKLOAD_VARIANCE_HOURS}h or less before publishing.`,
        data: {
          workload: {
            maxHours: workload.maxHours,
            minHours: workload.minHours,
            varianceHours: workload.varianceHours,
            limitHours: MAX_WORKLOAD_VARIANCE_HOURS,
          },
        },
      });
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
      } else if (task.assigned_to_email) {
        assignedTo = membersByEmail.get(String(task.assigned_to_email).trim().toLowerCase()) || null;
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

        await insertNotifications(client, {
          recipients: [assignedTo],
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          message: `You have been assigned a new task: ${newTask.title}`,
          relatedTaskId: newTask.task_id,
          relatedGroupId: groupId,
          relatedAssessmentId: assessment?.assessment_id || null,
        });
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
  const { title, description, status, priority, assigned_to_email, due_date, assessment_id, progress_percentage } = req.body;

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

    const normalizedProgress = Number.isFinite(Number(progress_percentage))
      ? Math.max(0, Math.min(100, Number(progress_percentage)))
      : null;

    const updateQuery = `
      UPDATE tasks
      SET title = COALESCE(NULLIF($1, ''), title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          assigned_to = CASE WHEN $5 IS NOT NULL THEN $5 ELSE assigned_to END,
          due_date = $6,
          assessment_id = COALESCE($7, assessment_id),
          progress_percentage = COALESCE($8, progress_percentage),
          updated_at = NOW()
      WHERE task_id = $9
      RETURNING *`;

    const taskResult = await pool.query(updateQuery, [
      title,
      description,
      status,
      priority ? priority.toUpperCase() : null,
      assignedUserId,
      due_date || null,
      assessment_id || null,
      normalizedProgress,
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
       SET status = $1,
           progress_percentage = CASE
             WHEN $1 = 'DONE' THEN 100
             WHEN $1 = 'TO_DO' THEN LEAST(progress_percentage, 25)
             ELSE progress_percentage
           END,
           updated_at = NOW()
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
  requestTaskChange,
  getTaskChangeRequests,
  acceptTaskChangeRequest,
  rejectTaskChangeRequest,
  getTaskSubtasks,
  addTaskSubtask,
  updateTaskSubtask,
};
