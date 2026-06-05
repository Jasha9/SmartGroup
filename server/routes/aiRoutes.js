const express = require("express");
const authMiddleware = require('../middleware/authMiddleware');
const { generateTasks } = require('../controllers/aiController');

const router = express.Router();

// POST /api/ai/generate-tasks
// Body: { assignmentText }
// Returns: { success: true, data: { tasks: [...] } }
router.post("/generate-tasks", authMiddleware, generateTasks);

module.exports = router;
