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

// POST /api/charters/accept
async function acceptCharter(req, res) {
  const { taskId } = req.body;
  const userId = req.user.user_id;
  if (!taskId) {
    return res.status(400).json({ success: false, error: 'taskId is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const charterResult = await client.query(
      `SELECT charter_id, group_id FROM charters WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId]
    );
    if (charterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Charter entry not found for this task and user.' });
    }

    const charter = charterResult.rows[0];

    const taskResult = await client.query(
      `UPDATE tasks
       SET status = 'TO_DO', is_signed = true, updated_at = NOW()
       WHERE task_id = $1
       RETURNING *`,
      [taskId]
    );

    await client.query(
      `UPDATE charters
       SET is_signed = true, status = 'accepted', signed_at = NOW()
       WHERE charter_id = $1`,
      [charter.charter_id]
    );

    await client.query('COMMIT');
    return res.json({ success: true, data: { task: taskResult.rows[0], charterId: charter.charter_id } });
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
  const { taskId } = req.body;
  const userId = req.user.user_id;
  if (!taskId) {
    return res.status(400).json({ success: false, error: 'taskId is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const charterResult = await client.query(
      `SELECT charter_id, group_id FROM charters WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId]
    );
    if (charterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Charter entry not found for this task and user.' });
    }

    const charter = charterResult.rows[0];

    const taskResult = await client.query(
      `UPDATE tasks
       SET status = 'NEGOTIATING', updated_at = NOW()
       WHERE task_id = $1
       RETURNING *`,
      [taskId]
    );

    await client.query(
      `UPDATE charters
       SET status = 'negotiating', is_signed = false
       WHERE charter_id = $1`,
      [charter.charter_id]
    );

    await client.query('COMMIT');
    return res.json({ success: true, data: { task: taskResult.rows[0], charterId: charter.charter_id } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[negotiateCharter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to negotiate charter.' });
  } finally {
    client.release();
  }
}

module.exports = { getCharter, acceptCharter, negotiateCharter };
