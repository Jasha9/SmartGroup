const express = require('express');
const { getCharter, signCharter, acceptCharter, negotiateCharter } = require('../controllers/charterController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:groupId', authMiddleware, getCharter);
router.post('/sign', authMiddleware, signCharter);
router.post('/accept', authMiddleware, acceptCharter);
router.post('/negotiate', authMiddleware, negotiateCharter);

module.exports = router;
