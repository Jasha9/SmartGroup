const express = require('express');
const { getCharter, signCharter } = require('../controllers/charterController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getCharter);
router.post('/sign', authMiddleware, signCharter);

module.exports = router;
