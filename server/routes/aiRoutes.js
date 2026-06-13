const express = require("express");
const multer = require("multer");
const authMiddleware = require('../middleware/authMiddleware');
const { generateTasks } = require('../controllers/aiController');

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024,
	},
});

// POST /api/ai/generate-tasks
// Body: multipart/form-data with optional assignmentFile and assignmentText
// Returns: { success: true, data: { tasks: [...] } }
router.post("/generate-tasks", authMiddleware, upload.single('assignmentFile'), generateTasks);

module.exports = router;
