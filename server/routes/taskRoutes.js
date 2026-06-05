const express = require('express');
const { getTasks, createTasks, bulkSaveTasks, updateTask } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getTasks);
router.post('/', authMiddleware, createTasks);
router.post('/bulk', authMiddleware, bulkSaveTasks);
router.patch('/:taskId', authMiddleware, updateTask);

module.exports = router;
