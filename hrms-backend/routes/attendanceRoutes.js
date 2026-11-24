const express = require('express');
const AttendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Tất cả routes đều yêu cầu xác thực JWT
router.use(authMiddleware);

// Xác minh khuôn mặt trước khi check-in (Bảo mật 2 bước)
router.post('/verify-face', AttendanceController.verifyFace);

// Chấm công vào bằng face
router.post('/check-in', AttendanceController.checkIn);

// Chấm công ra bằng face
router.post('/check-out', AttendanceController.checkOut);

// Lấy trạng thái chấm công hôm nay
router.get('/today', AttendanceController.getToday);

// Lấy lịch sử chấm công của 1 nhân viên (Admin xem được tất cả, nhân viên chỉ xem được của mình)
router.get('/employee-history', AttendanceController.getEmployeeHistory);

// Lấy lịch sử chấm công (Admin, HR Manager, Department Manager)
router.get('/history', roleMiddleware('admin', 'hr_manager', 'department_manager'), AttendanceController.getHistory);

// Lấy danh sách cảnh báo vi phạm (Admin, HR Manager, Department Manager)
router.get('/warnings', roleMiddleware('admin', 'hr_manager', 'department_manager'), AttendanceController.getWarnings);

// Kiểm tra trạng thái chấm công hôm nay (cho Extension kiểm tra trước khi cho logout)
router.get('/check-status', AttendanceController.checkAttendanceStatus);

// Yêu cầu giải trình (Admin, HR Manager, Department Manager)
router.post('/:id/request-explanation', roleMiddleware('admin', 'hr_manager', 'department_manager'), AttendanceController.requestExplanation);

// Gửi cảnh báo thủ công (Admin, HR Manager, Department Manager)
router.post('/send-warning/:employeeId', roleMiddleware('admin', 'hr_manager', 'department_manager'), AttendanceController.sendManualWarning);

// Lấy chi tiết bản ghi chấm công theo ID
router.get('/:id', AttendanceController.getById);

// Nộp giải trình (Nhân viên)
router.post('/:id/submit-explanation', AttendanceController.submitExplanation);

module.exports = router;
