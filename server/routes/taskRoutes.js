const express = require('express');
const { getTasks, createTasks, updateTask } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getTasks);
router.post('/', authMiddleware, createTasks);
router.post('/bulk', authMiddleware, createTasks);
router.patch('/:taskId', authMiddleware, updateTask);

module.exports = router;
