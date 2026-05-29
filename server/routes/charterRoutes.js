const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Charter routes working",
    sampleCharters: [
      {
        id: 1,
        member: "Jashandeep",
        status: "Accepted",
        is_signed: true,
      },
      {
        id: 2,
        member: "Dilraj",
        status: "Pending",
        is_signed: false,
      },
    ],
  });
});

module.exports = router;
