const express = require('express');
const { getNotifications, createNotification, markRead } = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getNotifications);
router.post('/', authMiddleware, createNotification);
router.patch('/:id/read', authMiddleware, markRead);

module.exports = router;
