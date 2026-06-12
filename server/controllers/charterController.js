const pool = require('../db/db');

// GET /api/charters/:groupId
async function getCharter(req, res) {
  const { groupId } = req.params;
  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }
  try {
    const result = await pool.query(
      `SELECT c.charter_id, c.user_id, c.group_id, c.task_id, c.status, c.is_signed, c.signed_at,
              t.title AS task_title, t.description AS task_description, t.status AS task_status,
              t.priority, t.due_date, t.assessment_id,
              a.title AS assessment_title,
              g.group_name,
              u.full_name, u.email
       FROM charters c
       JOIN tasks t ON c.task_id = t.task_id
       LEFT JOIN assessments a ON t.assessment_id = a.assessment_id
       LEFT JOIN groups g ON c.group_id = g.group_id
       JOIN users u ON c.user_id = u.user_id
       WHERE c.group_id = $1
       ORDER BY COALESCE(a.due_date, CURRENT_DATE + INTERVAL '365 days') ASC, a.title ASC, u.full_name ASC`,
      [groupId]
    );
    return res.json({ success: true, data: { responsibilities: result.rows } });
  } catch (err) {
    console.error('[getCharter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch charter.' });
  }
}

// POST /api/charters/sign
async function signCharter(req, res) {
  const { groupId } = req.body;
  const userId = req.user.user_id;
  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }
  try {
    const result = await pool.query(
      `UPDATE charters
       SET is_signed = true, signed_at = NOW(), status = 'accepted'
       WHERE user_id = $1 AND group_id = $2
       RETURNING *`,
      [userId, groupId]
    );
    return res.json({ success: true, data: { updated: result.rowCount } });
  } catch (err) {
    console.error('[signCharter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to sign charter.' });
  }
}

// POST /api/charters/accept
async function acceptCharter(req, res) {
  const { notificationId, taskId, groupId } = req.body;
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let charterResult;

    if (notificationId) {
      charterResult = await client.query(
        `UPDATE charters c
         SET status = 'ACCEPTED', is_signed = true, signed_at = NOW()
         FROM notifications n
         WHERE n.notification_id = $1
           AND n.user_id = $2
           AND c.user_id = $2
           AND c.group_id = n.group_id
           AND c.task_id = n.task_id
         RETURNING c.*`,
        [notificationId, userId]
      );
    } else if (taskId) {
      charterResult = await client.query(
        `SELECT charter_id, group_id FROM charters WHERE task_id = $1 AND user_id = $2`,
        [taskId, userId]
      );
      if (charterResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Charter entry not found for this task and user.' });
      }
      const charter = charterResult.rows[0];
      charterResult = await client.query(
        `UPDATE charters
         SET is_signed = true, status = 'ACCEPTED', signed_at = NOW()
         WHERE charter_id = $1
         RETURNING *`,
        [charter.charter_id]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'notificationId or taskId is required.' });
    }

    if (charterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Charter entry not found or access denied.' });
    }

    const taskIdToUpdate = charterResult.rows[0].task_id;
    const taskResult = await client.query(
      `UPDATE tasks
       SET status = 'TO_DO', is_signed = true, updated_at = NOW()
       WHERE task_id = $1
       RETURNING *`,
      [taskIdToUpdate]
    );

    await client.query('COMMIT');
    return res.json({ success: true, data: { task: taskResult.rows[0], updated: charterResult.rowCount } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[acceptCharter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to accept charter.' });
  } finally {
    client.release();
  }
}

// POST /api/charters/negotiate
async function negotiateCharter(req, res) {
  const { notificationId, taskId, groupId } = req.body;
  const userId = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let charterResult;

    if (notificationId) {
      charterResult = await client.query(
        `UPDATE charters c
         SET status = 'NEGOTIATING', is_signed = false
         FROM notifications n
         WHERE n.notification_id = $1
           AND n.user_id = $2
           AND c.user_id = $2
           AND c.group_id = n.group_id
           AND c.task_id = n.task_id
         RETURNING c.*`,
        [notificationId, userId]
      );
    } else if (taskId) {
      charterResult = await client.query(
        `SELECT charter_id, group_id FROM charters WHERE task_id = $1 AND user_id = $2`,
        [taskId, userId]
      );
      if (charterResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Charter entry not found for this task and user.' });
      }
      const charter = charterResult.rows[0];
      charterResult = await client.query(
        `UPDATE charters
         SET status = 'NEGOTIATING', is_signed = false
         WHERE charter_id = $1
         RETURNING *`,
        [charter.charter_id]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'notificationId or taskId is required.' });
    }

    if (charterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Charter entry not found or access denied.' });
    }

    const taskIdToUpdate = charterResult.rows[0].task_id;
    const taskResult = await client.query(
      `UPDATE tasks
       SET status = 'NEGOTIATING', updated_at = NOW()
       WHERE task_id = $1
       RETURNING *`,
      [taskIdToUpdate]
    );

    await client.query('COMMIT');
    return res.json({ success: true, data: { task: taskResult.rows[0], updated: charterResult.rowCount } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[negotiateCharter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to request negotiation.' });
  } finally {
    client.release();
  }
}

module.exports = { getCharter, signCharter, acceptCharter, negotiateCharter };
