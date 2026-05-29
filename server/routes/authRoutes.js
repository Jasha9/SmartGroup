const express = require("express");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/mock-login", (req, res) => {
  const mockUser = {
    user_id: "demo-user-id",
    email: "student@gmail.com",
    full_name: "Demo Student",
    role: "STUDENT",
  };

  const token = jwt.sign(mockUser, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.json({
    message: "Mock login successful",
    user: mockUser,
    token,
  });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Authenticated user fetched successfully",
    user: req.user,
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");

  res.json({
    message: "Logged out successfully",
  });
});

module.exports = router;
