const pool = require('../db/db');

// GET /api/notifications
async function getNotifications(req, res) {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `SELECT notification_id, user_id, group_id, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return res.json({ success: true, data: { notifications: result.rows } });
  } catch (err) {
    console.error('[getNotifications]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2`,
      [id, userId]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[markRead]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read.' });
  }
}

module.exports = { getNotifications, markRead };
