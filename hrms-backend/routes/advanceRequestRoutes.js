const express = require('express');
const AdvanceRequestController = require('../controllers/advanceRequestController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/me', authMiddleware, AdvanceRequestController.getMyRequests);
router.get('/', authMiddleware, roleMiddleware('admin', 'hr_manager'), AdvanceRequestController.getAllRequests);
router.post('/', authMiddleware, AdvanceRequestController.createRequest);
router.put('/:id/status', authMiddleware, roleMiddleware('admin', 'hr_manager'), AdvanceRequestController.updateStatus);

module.exports = router;
