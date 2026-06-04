const pool = require('../db/db');

// GET /api/groups
async function getGroups(req, res) {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `SELECT g.group_id, g.group_name, g.description, g.status, g.created_at,
              m.role AS member_role
       FROM groups g
       JOIN memberships m ON g.group_id = m.group_id
       WHERE m.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId]
    );
    return res.json({ success: true, data: { groups: result.rows } });
  } catch (err) {
    console.error('[getGroups]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch groups.' });
  }
}

// POST /api/groups
async function createGroup(req, res) {
  const { name, description, memberEmails = [] } = req.body;
  const creatorId = req.user.user_id;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert group
    const groupResult = await client.query(
      `INSERT INTO groups (group_name, description, status, created_by)
       VALUES ($1, $2, 'ACTIVE', $3)
       RETURNING *`,
      [name.trim(), description?.trim() || '', creatorId]
    );
    const group = groupResult.rows[0];

    // Add creator as OWNER in memberships
    await client.query(
      `INSERT INTO memberships (user_id, group_id, role) VALUES ($1, $2, 'OWNER')`,
      [creatorId, group.group_id]
    );

    // For each invited email: look up user and add membership + notification
    for (const email of memberEmails) {
      if (!email || !email.trim()) continue;
      const userRes = await client.query(
        `SELECT user_id FROM users WHERE email = $1`,
        [email.trim().toLowerCase()]
      );
      if (userRes.rows.length > 0) {
        const invitedUserId = userRes.rows[0].user_id;
        // Add membership (ignore duplicate)
        await client.query(
          `INSERT INTO memberships (user_id, group_id, role) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING`,
          [invitedUserId, group.group_id]
        );
        // Create notification
        await client.query(
          `INSERT INTO notifications (user_id, group_id, message, type, is_read)
           VALUES ($1, $2, $3, 'GROUP_INVITE', false)`,
          [
            invitedUserId,
            group.group_id,
            `You have been added to "${group.group_name}". Open the workspace to get started.`,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { group } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[createGroup]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create group.' });
  } finally {
    client.release();
  }
}

module.exports = { getGroups, createGroup };
