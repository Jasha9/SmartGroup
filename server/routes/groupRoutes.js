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

module.exports = router;
