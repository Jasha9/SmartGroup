const express = require('express');
const { getContributions } = require('../controllers/contributionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:groupId', authMiddleware, getContributions);

module.exports = router;
