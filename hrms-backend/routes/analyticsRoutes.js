const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const adminGuard = [authMiddleware, roleMiddleware('admin', 'hr_manager', 'department_manager')];

// GET /api/analytics/overview
router.get('/overview',               ...adminGuard, AnalyticsController.getOverview);

// GET /api/analytics/attendance-trend?days=30
router.get('/attendance-trend',       ...adminGuard, AnalyticsController.getAttendanceTrend);

// GET /api/analytics/payroll-summary?year=2026
router.get('/payroll-summary',        ...adminGuard, AnalyticsController.getPayrollSummary);

// GET /api/analytics/department-attendance
router.get('/department-attendance',  ...adminGuard, AnalyticsController.getDepartmentAttendance);

// GET /api/analytics/leave-stats
router.get('/leave-stats', authMiddleware, roleMiddleware('admin'), AnalyticsController.getLeaveStats);

// Phân tích thông minh bằng AI
router.get('/ai-insights', authMiddleware, roleMiddleware('admin'), AnalyticsController.getAIInsights);

module.exports = router;
