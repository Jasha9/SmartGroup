const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Notification routes working",
    notifications: [
      {
        id: 1,
        message: "Khushi moved a task to In Progress",
        type: "TASK_UPDATE",
        is_read: false,
      },
    ],
  });
});

module.exports = router;
