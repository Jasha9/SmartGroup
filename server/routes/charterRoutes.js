const express = require('express');
const { getCharter, acceptCharter, negotiateCharter } = require('../controllers/charterController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:groupId', authMiddleware, getCharter);
router.post('/accept', authMiddleware, acceptCharter);
router.post('/negotiate', authMiddleware, negotiateCharter);

module.exports = router;
