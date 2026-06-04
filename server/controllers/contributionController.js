const pool = require('../db/db');

// GET /api/contributions/:groupId
async function getContributions(req, res) {
  const { groupId } = req.params;
  try {
    // Per-member task counts
    const membersResult = await pool.query(
      `SELECT u.user_id, u.full_name, u.email,
              COUNT(t.task_id) FILTER (WHERE t.status = 'DONE') AS completed,
              COUNT(t.task_id) AS total,
              COUNT(t.task_id) FILTER (WHERE t.due_date < NOW() AND t.status != 'DONE') AS overdue
       FROM memberships m
       JOIN users u ON m.user_id = u.user_id
       LEFT JOIN tasks t ON t.group_id = m.group_id AND t.assigned_to = u.user_id
       WHERE m.group_id = $1
       GROUP BY u.user_id, u.full_name, u.email
       ORDER BY completed DESC`,
      [groupId]
    );

    const members = membersResult.rows.map((row) => ({
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      completed: Number(row.completed),
      total: Number(row.total),
      overdue: Number(row.overdue),
      percentage:
        Number(row.total) > 0
          ? Math.round((Number(row.completed) / Number(row.total)) * 100)
          : 0,
    }));

    const totalCompleted = members.reduce((s, m) => s + m.completed, 0);
    const totalOverdue = members.reduce((s, m) => s + m.overdue, 0);
    const teamAvg =
      members.length > 0
        ? Math.round(members.reduce((s, m) => s + m.percentage, 0) / members.length)
        : 0;

    return res.json({
      success: true,
      data: {
        contributions: members,
        summary: { teamAvg, totalCompleted, totalOverdue },
      },
    });
  } catch (err) {
    console.error('[getContributions]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch contributions.' });
  }
}

module.exports = { getContributions };
