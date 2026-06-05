const express = require('express');
const { getGroups, createGroup, updateGroup, deleteGroup, getGroupMembers } = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getGroups);
router.get('/:groupId/members', authMiddleware, getGroupMembers);
router.post('/', authMiddleware, createGroup);
router.put('/:groupId', authMiddleware, updateGroup);
router.delete('/:groupId', authMiddleware, deleteGroup);

module.exports = router;
