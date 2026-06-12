const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAssessments,
  getAssessmentsByGroup,
  createAssessment,
} = require('../controllers/assessmentController');

const router = express.Router();

router.get('/', authMiddleware, getAssessments);
router.get('/group/:groupId', authMiddleware, getAssessmentsByGroup);
router.post('/', authMiddleware, createAssessment);

module.exports = router;
