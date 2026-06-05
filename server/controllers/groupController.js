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

// GET /api/groups/:groupId/members
async function getGroupMembers(req, res) {
  const { groupId } = req.params;
  const userId = req.user.user_id;

  try {
    const accessCheck = await pool.query(
      `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ success: false, error: 'Access denied to group members.' });
    }

    const members = await pool.query(
      `SELECT u.user_id, u.full_name, u.email
       FROM memberships m
       JOIN users u ON m.user_id = u.user_id
       WHERE m.group_id = $1
       ORDER BY u.full_name ASC`,
      [groupId]
    );

    return res.json({ success: true, data: members.rows });
  } catch (err) {
    console.error('[getGroupMembers]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch group members.' });
  }
}

// POST /api/groups/:groupId/members
async function addGroupMember(req, res) {
  const { groupId } = req.params;
  const { email, user_id: userIdBody } = req.body;
  const userId = req.user.user_id;

  if (!email && !userIdBody) {
    return res.status(400).json({ success: false, error: 'Email or user_id is required.' });
  }

  try {
    const accessCheck = await pool.query(
      `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ success: false, error: 'Access denied to group members.' });
    }

    let memberUser;
    if (userIdBody) {
      const memberRes = await pool.query(
        `SELECT user_id, full_name, email FROM users WHERE user_id = $1`,
        [userIdBody]
      );
      memberUser = memberRes.rows[0];
    } else {
      const memberRes = await pool.query(
        `SELECT user_id, full_name, email FROM users WHERE email = $1`,
        [email.trim().toLowerCase()]
      );
      memberUser = memberRes.rows[0];

      if (!memberUser) {
        const displayName = email.split('@')[0];
        const createdUser = await pool.query(
          `INSERT INTO users (email, full_name, role, is_onboarded)
           VALUES ($1, $2, 'STUDENT', false)
           RETURNING user_id, full_name, email`,
          [email.trim().toLowerCase(), displayName]
        );
        memberUser = createdUser.rows[0];
      }
    }

    await pool.query(
      `INSERT INTO memberships (user_id, group_id, role)
       VALUES ($1, $2, 'MEMBER')
       ON CONFLICT (user_id, group_id) DO NOTHING`,
      [memberUser.user_id, groupId]
    );

    const members = await pool.query(
      `SELECT u.user_id, u.full_name, u.email
       FROM memberships m
       JOIN users u ON m.user_id = u.user_id
       WHERE m.group_id = $1
       ORDER BY u.full_name ASC`,
      [groupId]
    );

    return res.status(201).json({ success: true, data: members.rows });
  } catch (err) {
    console.error('[addGroupMember]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add member to group.' });
  }
}

// PUT /api/groups/:groupId
async function updateGroup(req, res) {
  const { groupId } = req.params;
  const { name, description, status } = req.body;
  const userId = req.user.user_id;

  if (!groupId) {
    return res.status(400).json({ success: false, error: 'Group ID is required.' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name is required.' });
  }

  try {
    const groupResult = await pool.query(
      `UPDATE groups
       SET group_name = $1, description = $2, status = COALESCE($3, status)
       WHERE group_id = $4
       AND EXISTS (
         SELECT 1 FROM memberships WHERE group_id = $4 AND user_id = $5
       )
       RETURNING *`,
      [name.trim(), description?.trim() || '', status || null, groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found or access denied.' });
    }

    return res.json({ success: true, data: { group: groupResult.rows[0] } });
  } catch (err) {
    console.error('[updateGroup]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update group.' });
  }
}

// DELETE /api/groups/:groupId
async function deleteGroup(req, res) {
  const { groupId } = req.params;
  const userId = req.user.user_id;

  if (!groupId) {
    return res.status(400).json({ success: false, error: 'Group ID is required.' });
  }

  try {
    const deleteResult = await pool.query(
      `DELETE FROM groups
       WHERE group_id = $1
       AND EXISTS (
         SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2
       )`,
      [groupId, userId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Group not found or access denied.' });
    }

    return res.json({ success: true, data: { message: 'Group deleted successfully.' } });
  } catch (err) {
    console.error('[deleteGroup]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete group.' });
  }
}


module.exports = { getGroups, createGroup, getGroupMembers, addGroupMember, updateGroup, deleteGroup };
