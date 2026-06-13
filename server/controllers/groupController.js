const pool = require('../db/db');

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function extractMentions(messageText) {
  const matches = String(messageText || '').matchAll(/@([a-zA-Z0-9._%+-]+(?:\s+[a-zA-Z0-9._%+-]+)*)/g);
  return Array.from(matches).map((match) => normalizeText(match[1]));
}

async function insertNotifications(client, { recipients, type, title, message, relatedGroupId = null }) {
  if (!Array.isArray(recipients) || recipients.length === 0) return;

  const values = [];
  const placeholders = recipients.map((recipientId, index) => {
    const base = index * 10;
    values.push(
      recipientId,
      relatedGroupId,
      null,
      title,
      message,
      type,
      null,
      relatedGroupId,
      null,
      false
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
  });

  await client.query(
    `INSERT INTO notifications (
      user_id, group_id, task_id, title, message, type,
      related_task_id, related_group_id, related_assessment_id, is_read
    ) VALUES ${placeholders.join(', ')}`,
    values
  );
}

async function resolveMentionedUsers(client, groupId, mentionTokens, senderUserId) {
  if (!Array.isArray(mentionTokens) || mentionTokens.length === 0) return [];

  const membersRes = await client.query(
    `SELECT u.user_id, u.full_name, u.email
     FROM memberships m
     JOIN users u ON u.user_id = m.user_id
     WHERE m.group_id = $1`,
    [groupId]
  );

  const aliasMap = new Map();
  for (const member of membersRes.rows) {
    const aliases = new Set();
    const email = normalizeText(member.email);
    const fullName = normalizeText(member.full_name);

    if (email) {
      aliases.add(email);
      aliases.add(email.split('@')[0]);
    }

    if (fullName) {
      aliases.add(fullName);
      aliases.add(fullName.replace(/\s+/g, ''));
      fullName.split(/\s+/).forEach((part) => aliases.add(part));
    }

    for (const alias of aliases) {
      if (!alias) continue;
      if (!aliasMap.has(alias)) aliasMap.set(alias, new Set());
      aliasMap.get(alias).add(member.user_id);
    }
  }

  const mentioned = new Set();
  for (const token of mentionTokens) {
    const key = normalizeText(token);
    const matched = aliasMap.get(key);
    if (!matched) continue;
    for (const uid of matched.values()) {
      if (uid !== senderUserId) mentioned.add(uid);
    }
  }

  return Array.from(mentioned);
}

// GET /api/groups
async function getGroups(req, res) {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `SELECT g.group_id, g.group_name, g.description, g.status, g.created_at,
              m.role AS member_role,
              COALESCE(mc.member_count, 0)::INT AS member_count
       FROM groups g
       JOIN memberships m ON g.group_id = m.group_id
       LEFT JOIN (
         SELECT group_id, COUNT(*)::INT AS member_count
         FROM memberships
         GROUP BY group_id
       ) mc ON mc.group_id = g.group_id
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
      `SELECT u.user_id, u.full_name, u.email, m.role
       FROM memberships m
       JOIN users u ON m.user_id = u.user_id
       WHERE m.group_id = $1
       ORDER BY u.full_name ASC`,
      [groupId]
    );

    return res.json({ success: true, data: { members: members.rows } });
  } catch (err) {
    console.error('[getGroupMembers]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch group members.' });
  }
}

// GET /api/groups/:groupId/assessments
async function getGroupAssessments(req, res) {
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
      `SELECT a.assessment_id,
              a.group_id,
              a.title,
              a.description,
              a.due_date,
              a.created_at,
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
    console.error('[getGroupAssessments]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch group assessments.' });
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

    return res.status(201).json({ success: true, data: { members: members.rows } });
  } catch (err) {
    console.error('[addGroupMember]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add member to group.' });
  }
}

// GET /api/groups/:groupId/messages
async function getGroupMessages(req, res) {
  const { groupId } = req.params;
  const userId = req.user.user_id;

  try {
    const accessCheck = await pool.query(
      `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ success: false, error: 'Access denied to group messages.' });
    }

    const result = await pool.query(
      `SELECT gm.message_id, gm.group_id, gm.user_id, gm.message_text, gm.created_at,
              u.full_name, u.email,
              COALESCE(mentions.mentioned_user_ids, '[]'::json) AS mentioned_user_ids
       FROM group_messages gm
       JOIN users u ON gm.user_id = u.user_id
       LEFT JOIN LATERAL (
         SELECT json_agg(gmm.mentioned_user_id) AS mentioned_user_ids
         FROM group_message_mentions gmm
         WHERE gmm.message_id = gm.message_id
       ) mentions ON true
       WHERE gm.group_id = $1
       ORDER BY gm.created_at ASC
       LIMIT 200`,
      [groupId]
    );

    return res.json({ success: true, data: { messages: result.rows } });
  } catch (err) {
    console.error('[getGroupMessages]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch group messages.' });
  }
}

// POST /api/groups/:groupId/messages
async function addGroupMessage(req, res) {
  const { groupId } = req.params;
  const { message_text, message, mentions } = req.body;
  const userId = req.user.user_id;

  const text = String(message_text || message || '').trim();
  if (!text) {
    return res.status(400).json({ success: false, error: 'message_text is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accessCheck = await pool.query(
      `SELECT 1 FROM memberships WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (accessCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Access denied to group messages.' });
    }

    const inserted = await client.query(
      `INSERT INTO group_messages (group_id, user_id, message_text)
       VALUES ($1, $2, $3)
       RETURNING message_id, group_id, user_id, message_text, created_at`,
      [groupId, userId, text]
    );

    const messageRow = inserted.rows[0];
    const userRes = await client.query(
      `SELECT full_name, email FROM users WHERE user_id = $1`,
      [userId]
    );

    const rawMentionTokens = Array.isArray(mentions) && mentions.length
      ? mentions
      : extractMentions(text);

    const mentionedUserIds = await resolveMentionedUsers(client, groupId, rawMentionTokens, userId);

    for (const mentionedUserId of mentionedUserIds) {
      await client.query(
        `INSERT INTO group_message_mentions (message_id, mentioned_user_id)
         VALUES ($1, $2)
         ON CONFLICT (message_id, mentioned_user_id) DO NOTHING`,
        [messageRow.message_id, mentionedUserId]
      );
    }

    const senderName = userRes.rows[0]?.full_name || userRes.rows[0]?.email || 'A teammate';
    await insertNotifications(client, {
      recipients: mentionedUserIds,
      type: 'GROUP_MENTION',
      title: 'Group Mention',
      message: `${senderName} mentioned you in group chat.`,
      relatedGroupId: groupId,
    });

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        message: {
          ...messageRow,
          full_name: userRes.rows[0]?.full_name || null,
          email: userRes.rows[0]?.email || null,
          mentioned_user_ids: mentionedUserIds,
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[addGroupMessage]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send group message.' });
  } finally {
    client.release();
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


module.exports = {
  getGroups,
  createGroup,
  getGroupMembers,
  getGroupAssessments,
  addGroupMember,
  getGroupMessages,
  addGroupMessage,
  updateGroup,
  deleteGroup,
};
