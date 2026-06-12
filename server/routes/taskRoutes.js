const express = require('express');
const {
	getTasks,
	getMyTasks,
	getTaskComments,
	addTaskComment,
	createTasks,
	bulkSaveTasks,
	updateTask,
	updateTaskStatus,
	requestTaskChange,
	getTaskChangeRequests,
	acceptTaskChangeRequest,
	rejectTaskChangeRequest,
	getTaskSubtasks,
	addTaskSubtask,
	updateTaskSubtask,
} = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getTasks);
router.get('/my-tasks', authMiddleware, getMyTasks);
router.get('/change-requests', authMiddleware, getTaskChangeRequests);
router.post('/change-requests/:id/accept', authMiddleware, acceptTaskChangeRequest);
router.post('/change-requests/:id/reject', authMiddleware, rejectTaskChangeRequest);
router.post('/', authMiddleware, createTasks);
router.post('/bulk', authMiddleware, bulkSaveTasks);
router.post('/:taskId/request-change', authMiddleware, requestTaskChange);
router.get('/:taskId/comments', authMiddleware, getTaskComments);
router.post('/:taskId/comments', authMiddleware, addTaskComment);
router.get('/:taskId/subtasks', authMiddleware, getTaskSubtasks);
router.post('/:taskId/subtasks', authMiddleware, addTaskSubtask);
router.patch('/:taskId/subtasks/:subtaskId', authMiddleware, updateTaskSubtask);
router.patch('/:taskId', authMiddleware, updateTask);
router.patch('/:taskId/status', authMiddleware, updateTaskStatus);

module.exports = router;
