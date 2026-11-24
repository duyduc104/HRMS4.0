const express = require('express');
const router = express.Router();
const securityAIController = require('../controllers/securityAIController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// API Endpoint to check scam text
router.post('/check-scam', authMiddleware, securityAIController.checkScamText);

// API Endpoint to verify document
router.post('/verify-document', authMiddleware, securityAIController.verifyDocument);

module.exports = router;
