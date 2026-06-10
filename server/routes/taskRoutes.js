const express = require('express');
const { getTasks, getMyTasks, getTaskComments, addTaskComment, createTasks, bulkSaveTasks, updateTask, updateTaskStatus } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getTasks);
router.get('/my-tasks', authMiddleware, getMyTasks);
router.post('/', authMiddleware, createTasks);
router.post('/bulk', authMiddleware, bulkSaveTasks);
router.get('/:taskId/comments', authMiddleware, getTaskComments);
router.post('/:taskId/comments', authMiddleware, addTaskComment);
router.patch('/:taskId', authMiddleware, updateTask);
router.patch('/:taskId/status', authMiddleware, updateTaskStatus);

module.exports = router;
