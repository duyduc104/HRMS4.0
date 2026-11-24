const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// === LEAVE ROUTES ===
router.get('/', authMiddleware, leaveController.getMyLeaves);
router.post('/', authMiddleware, leaveController.createLeave);
router.delete('/:id', authMiddleware, leaveController.cancelLeave);
router.get('/pending', authMiddleware, roleMiddleware('admin', 'hr_manager', 'department_manager'), leaveController.getAllPendingLeaves);
router.put('/:id/approve', authMiddleware, roleMiddleware('admin', 'hr_manager', 'department_manager'), leaveController.approveLeave);
router.put('/:id/reject', authMiddleware, roleMiddleware('admin', 'hr_manager', 'department_manager'), leaveController.rejectLeave);

// === EXPLANATION ROUTES ===
router.get('/explanations', authMiddleware, leaveController.getMyExplanations);
router.post('/explanations', authMiddleware, leaveController.createExplanation);
router.get('/explanations/pending', authMiddleware, roleMiddleware('admin', 'hr_manager', 'department_manager'), leaveController.getAllPendingExplanations);
router.put('/explanations/:id/approve', authMiddleware, roleMiddleware('admin', 'hr_manager', 'department_manager'), leaveController.approveExplanation);
router.put('/explanations/:id/reject', authMiddleware, roleMiddleware('admin', 'hr_manager', 'department_manager'), leaveController.rejectExplanation);

module.exports = router;
