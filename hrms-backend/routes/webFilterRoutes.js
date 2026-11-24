const express = require('express');
const router = express.Router();
const webFilterController = require('../controllers/webFilterController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ---- Routes cho Extension/Agent (mọi nhân viên đã đăng nhập đều có thể dùng) ----
router.get('/rules', authMiddleware, webFilterController.getRules);
router.post('/logs', authMiddleware, webFilterController.addLog);
router.post('/heartbeat', authMiddleware, webFilterController.heartbeat);
router.get('/check-locked', authMiddleware, webFilterController.checkLocked);
router.get('/pending-violation', authMiddleware, webFilterController.getPendingViolation);
router.post('/submit-violation', authMiddleware, webFilterController.submitViolationExplanation);

// ---- Routes cho Admin quản lý ----
router.post('/rules', authMiddleware, roleMiddleware('admin'), webFilterController.createRule);
router.put('/rules/:id', authMiddleware, roleMiddleware('admin'), webFilterController.updateRule);
router.delete('/rules/:id', authMiddleware, roleMiddleware('admin'), webFilterController.deleteRule);
router.get('/logs', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.getLogs);
router.post('/logs/warning', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.sendWarning);
router.get('/log-settings', authMiddleware, roleMiddleware('admin'), webFilterController.getLogSettings);
router.post('/log-settings', authMiddleware, roleMiddleware('admin'), webFilterController.updateLogSettings);
router.get('/extension-status', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.getExtensionStatus);
router.post('/extension-status/:employeeId/toggle', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.toggleEmployeeRequirement);
router.get('/anomaly-status', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.getAnomalyStatus);
router.post('/unlock/:employeeId', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.unlockEmployee);
router.get('/violations', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.getViolations);
router.post('/review-violation', authMiddleware, roleMiddleware('admin', 'hr_manager'), webFilterController.reviewViolation);

module.exports = router;
