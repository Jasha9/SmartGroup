const pool = require('../db/db');

// GET /api/assessments
async function getAssessments(req, res) {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT a.assessment_id, a.group_id, a.title, a.description, a.due_date, a.created_by, a.created_at,
              g.group_name,
              COUNT(t.task_id)::INT AS task_count,
              COUNT(t.task_id) FILTER (WHERE t.status = 'DONE')::INT AS done_count
       FROM assessments a
       JOIN groups g ON g.group_id = a.group_id
       JOIN memberships m ON m.group_id = a.group_id
       LEFT JOIN tasks t ON t.assessment_id = a.assessment_id
       WHERE m.user_id = $1
       GROUP BY a.assessment_id, g.group_name
       ORDER BY COALESCE(a.due_date, CURRENT_DATE + INTERVAL '365 days') ASC, a.created_at ASC`,
      [userId]
    );

    return res.json({ success: true, data: { assessments: result.rows } });
  } catch (err) {
    console.error('[getAssessments]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch assessments.' });
  }
}

// GET /api/assessments/group/:groupId
async function getAssessmentsByGroup(req, res) {
  const { groupId } = req.params;
  const userId = req.user.user_id;

  try {
    const accessCheck = await pool.query(
      `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ success: false, error: 'Access denied to group assessments.' });
    }

    const result = await pool.query(
      `SELECT a.assessment_id, a.group_id, a.title, a.description, a.due_date, a.created_by, a.created_at,
              COUNT(t.task_id)::INT AS task_count,
              COUNT(t.task_id) FILTER (WHERE t.status = 'DONE')::INT AS done_count,
              COUNT(t.task_id) FILTER (WHERE t.status = 'IN_PROGRESS')::INT AS in_progress_count,
              COUNT(t.task_id) FILTER (WHERE t.status = 'TO_DO' OR t.status = 'PENDING_ACCEPTANCE')::INT AS pending_count
       FROM assessments a
       LEFT JOIN tasks t ON t.assessment_id = a.assessment_id
       WHERE a.group_id = $1
       GROUP BY a.assessment_id
       ORDER BY COALESCE(a.due_date, CURRENT_DATE + INTERVAL '365 days') ASC, a.created_at ASC`,
      [groupId]
    );

    return res.json({ success: true, data: { assessments: result.rows } });
  } catch (err) {
    console.error('[getAssessmentsByGroup]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch group assessments.' });
  }
}

// POST /api/assessments
async function createAssessment(req, res) {
  const { group_id, title, description = '', due_date = null } = req.body;
  const userId = req.user.user_id;

  if (!group_id) {
    return res.status(400).json({ success: false, error: 'group_id is required.' });
  }
  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, error: 'title is required.' });
  }

  try {
    const accessCheck = await pool.query(
      `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
      [group_id, userId]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ success: false, error: 'Access denied to create assessment in this group.' });
    }

    const inserted = await pool.query(
      `INSERT INTO assessments (group_id, title, description, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING assessment_id, group_id, title, description, due_date, created_by, created_at`,
      [group_id, String(title).trim(), String(description || '').trim(), due_date || null, userId]
    );

    return res.status(201).json({ success: true, data: { assessment: inserted.rows[0] } });
  } catch (err) {
    console.error('[createAssessment]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create assessment.' });
  }
}

module.exports = {
  getAssessments,
  getAssessmentsByGroup,
  createAssessment,
};
