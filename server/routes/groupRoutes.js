const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Group routes working",
    sampleGroups: [
      {
        id: 1,
        name: "SmartGroup Capstone Team",
        status: "ACTIVE",
      },
    ],
  });
});

// POST /api/groups — create group and queue dashboard notifications for invited members
router.post("/", (req, res) => {
  const { name, description, memberEmails = [] } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required.' });
  }

  // TODO (Dilraj): replace stub with real DB insert into groups + memberships tables
  const newGroup = {
    group_id: `grp_${Date.now()}`,
    group_name: name.trim(),
    description: description?.trim() || '',
    status: 'ACTIVE',
    members: memberEmails,
    created_at: new Date().toISOString(),
    // Notification records to be written to DB once the user signs in with their Gmail
    pending_notifications: memberEmails.map((email) => ({
      type: 'GROUP_INVITE',
      message: `You have been added to "${name.trim()}". Open the workspace to get started.`,
      recipient_email: email,
      is_read: false,
    })),
  };

  res.status(201).json(newGroup);
});

module.exports = router;
