const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Task routes working",
    sampleTasks: [
      {
        id: 1,
        title: "Set up backend",
        status: "TO_DO",
        assigned_to: "Dilraj",
      },
    ],
  });
});

module.exports = router;
