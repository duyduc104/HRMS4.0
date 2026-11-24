const express = require('express');
const permissionController = require('../controllers/permissionController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Lấy danh sách Metadata Modules & Actions
router.get('/meta', permissionController.getMeta);

// Lấy & Cập nhật ma trận quyền Phòng ban (Admin & HR Manager)
router.get('/department', roleMiddleware(['admin', 'hr_manager']), permissionController.getDepartmentPermissions);
router.post('/department', roleMiddleware(['admin']), permissionController.updateDepartmentPermissions);

// Lấy & Cập nhật ma trận quyền đè riêng của Nhân viên (Admin)
router.get('/employee/:employeeId', roleMiddleware(['admin', 'hr_manager']), permissionController.getEmployeePermissions);
router.post('/employee/:employeeId', roleMiddleware(['admin']), permissionController.updateEmployeePermissions);

// Cấp/Tuớc cờ Admin tối cao của Nhân viên
router.put('/employee/:employeeId/admin', roleMiddleware(['admin']), permissionController.toggleEmployeeAdmin);

module.exports = router;
