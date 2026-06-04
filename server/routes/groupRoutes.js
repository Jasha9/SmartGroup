const express = require('express');
const { getGroups, createGroup } = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getGroups);
router.post('/', authMiddleware, createGroup);

module.exports = router;
