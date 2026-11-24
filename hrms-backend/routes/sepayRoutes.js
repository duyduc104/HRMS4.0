const express = require('express');
const router = express.Router();
const sepayController = require('../controllers/sepayController');

// Môi trường test/mô phỏng, không cần authentication token middleware
router.post('/webhook', sepayController.handleWebhook);

module.exports = router;
