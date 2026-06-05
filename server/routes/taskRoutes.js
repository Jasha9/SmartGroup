const express = require('express');
const { getTasks, createTasks, updateTask, updateTaskStatus } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getTasks);
router.post('/', authMiddleware, createTasks);
router.patch('/:taskId', authMiddleware, updateTask);
router.patch('/:taskId/status', authMiddleware, updateTaskStatus);

module.exports = router;
