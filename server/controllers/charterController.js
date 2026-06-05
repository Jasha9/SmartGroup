const pool = require('../db/db');

// GET /api/charters?groupId=<id>
async function getCharter(req, res) {
  const { groupId } = req.query;
  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required.' });
  }
  try {
    const result = await pool.query(
      `SELECT c.charter_id, c.user_id, c.group_id, c.task_id, c.status, c.is_signed, c.signed_at,
              t.title AS task_title, t.description AS task_description,
              u.full_name, u.email
       FROM charters c
       JOIN tasks t ON c.task_id = t.task_id
       JOIN users u ON c.user_id = u.user_id
       WHERE c.group_id = $1
       ORDER BY u.full_name ASC`,
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

  try {
    let charterResult;

    if (notificationId) {
      charterResult = await pool.query(
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
    } else if (taskId && groupId) {
      charterResult = await pool.query(
        `UPDATE charters
         SET status = 'ACCEPTED', is_signed = true, signed_at = NOW()
         WHERE user_id = $1 AND group_id = $2 AND task_id = $3
         RETURNING *`,
        [userId, groupId, taskId]
      );
    } else {
      return res.status(400).json({ success: false, error: 'notificationId or taskId/groupId is required.' });
    }

    if (charterResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Charter entry not found or access denied.' });
    }

    const taskIdToUpdate = charterResult.rows[0].task_id;
    await pool.query(
      `UPDATE tasks SET status = 'TO_DO' WHERE task_id = $1`,
      [taskIdToUpdate]
    );

    return res.json({ success: true, data: { updated: charterResult.rowCount } });
  } catch (err) {
    console.error('[acceptCharter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to accept charter.' });
  }
}

// POST /api/charters/negotiate
async function negotiateCharter(req, res) {
  const { notificationId, taskId, groupId } = req.body;
  const userId = req.user.user_id;

  try {
    let charterResult;

    if (notificationId) {
      charterResult = await pool.query(
        `UPDATE charters c
         SET status = 'NEGOTIATING'
         FROM notifications n
         WHERE n.notification_id = $1
           AND n.user_id = $2
           AND c.user_id = $2
           AND c.group_id = n.group_id
           AND c.task_id = n.task_id
         RETURNING c.*`,
        [notificationId, userId]
      );
    } else if (taskId && groupId) {
      charterResult = await pool.query(
        `UPDATE charters
         SET status = 'NEGOTIATING'
         WHERE user_id = $1 AND group_id = $2 AND task_id = $3
         RETURNING *`,
        [userId, groupId, taskId]
      );
    } else {
      return res.status(400).json({ success: false, error: 'notificationId or taskId/groupId is required.' });
    }

    if (charterResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Charter entry not found or access denied.' });
    }

    return res.json({ success: true, data: { updated: charterResult.rowCount } });
  } catch (err) {
    console.error('[negotiateCharter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to request negotiation.' });
  }
}

module.exports = { getCharter, signCharter, acceptCharter, negotiateCharter };
