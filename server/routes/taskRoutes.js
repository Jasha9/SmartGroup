const express = require('express');
const { getTasks, createTasks, bulkSaveTasks, updateTask, updateTaskStatus } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getTasks);
router.post('/', authMiddleware, createTasks);
router.post('/bulk', authMiddleware, bulkSaveTasks);
router.patch('/:taskId', authMiddleware, updateTask);
router.patch('/:taskId/status', authMiddleware, updateTaskStatus);

module.exports = router;
