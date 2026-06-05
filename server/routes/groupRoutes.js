const express = require('express');
const {
  getGroups,
  createGroup,
  getGroupMembers,
  addGroupMember,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getGroups);
router.post('/', authMiddleware, createGroup);
router.get('/:groupId/members', authMiddleware, getGroupMembers);
router.post('/:groupId/members', authMiddleware, addGroupMember);
router.put('/:groupId', authMiddleware, updateGroup);
router.delete('/:groupId', authMiddleware, deleteGroup);

module.exports = router;
