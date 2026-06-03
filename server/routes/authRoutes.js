const express = require("express");
const {
  googleLogin,
  getMe,
  logout,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/google", googleLogin);
router.get("/me", authMiddleware, getMe);
router.post("/logout", logout);

module.exports = router;
