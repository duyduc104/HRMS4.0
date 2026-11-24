const express = require('express');
const PayrollController = require('../controllers/payrollController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Lấy danh sách lương cá nhân
router.get('/me', authMiddleware, PayrollController.getMyPayrolls);

// Lấy danh sách lương của toàn bộ nhân viên (Chỉ Admin / HR)
router.get('/', authMiddleware, roleMiddleware('admin', 'hr_manager'), PayrollController.getAllPayrolls);

// Xuất Excel bảng lương (Chỉ Admin / HR)
router.get('/export-excel', authMiddleware, roleMiddleware('admin', 'hr_manager'), PayrollController.exportExcel);

// Tính lương (Chỉ Admin / HR)
router.post('/calculate', authMiddleware, roleMiddleware('admin', 'hr_manager'), PayrollController.calculatePayroll);

// Cập nhật trạng thái bảng lương (Chỉ Admin / HR)
router.put('/:id/status', authMiddleware, roleMiddleware('admin', 'hr_manager'), PayrollController.updateStatus);

// Cập nhật ứng lương (Chỉ Admin / HR)
router.put('/:id/advance', authMiddleware, roleMiddleware('admin', 'hr_manager'), PayrollController.updateAdvancePayment);

// Duyệt và gửi toàn bộ bảng lương (Chỉ Admin / HR)
router.post('/approve-all', authMiddleware, roleMiddleware('admin', 'hr_manager'), PayrollController.approveAll);

module.exports = router;
