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

module.exports = { getCharter, signCharter };
