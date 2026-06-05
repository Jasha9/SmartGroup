const pool = require('../db/db');

// GET /api/notifications
async function getNotifications(req, res) {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `SELECT notification_id, user_id, group_id, task_id, message, type, is_read, created_at
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

// POST /api/notifications
async function createNotification(req, res) {
  try {
    const { userId, userIds, groupId = null, taskId = null, message, type = 'INFO' } = req.body;

    const recipients = Array.isArray(userIds)
      ? userIds.filter(Boolean)
      : userId
        ? [userId]
        : [];

    if (!recipients.length) {
      return res.status(400).json({ success: false, error: 'userId or userIds is required.' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'message is required.' });
    }

    const values = [];
    const placeholders = recipients.map((uid, index) => {
      const base = index * 6;
      values.push(uid, groupId, taskId, message.trim(), type, false);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    });

    const result = await pool.query(
      `INSERT INTO notifications (user_id, group_id, task_id, message, type, is_read)
       VALUES ${placeholders.join(', ')}
       RETURNING notification_id, user_id, group_id, task_id, message, type, is_read, created_at`,
      values
    );

    return res.status(201).json({
      success: true,
      data: {
        created: result.rowCount,
        notifications: result.rows,
      },
    });
  } catch (err) {
    console.error('[createNotification]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create notification.' });
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

module.exports = { getNotifications, createNotification, markRead };
