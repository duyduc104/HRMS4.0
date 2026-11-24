const express = require('express');
const router = express.Router();
const KPIController = require('../controllers/kpiController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Tất cả routes KPI đều yêu cầu xác thực JWT
router.use(authMiddleware);

// Lấy KPI của người dùng hiện tại
router.get('/my', KPIController.getMyKPIs);

// Cập nhật tiến độ / kết quả của một KPI (nhân viên sở hữu hoặc quản lý)
router.put('/:id/progress', KPIController.updateProgress);

// Lấy danh sách KPI tất cả nhân viên (Admin / HR Manager / Department Manager)
router.get('/', roleMiddleware('admin', 'hr_manager', 'department_manager'), KPIController.getAllKPIs);

// Tạo mới KPI (Admin / HR Manager / Department Manager)
router.post('/', roleMiddleware('admin', 'hr_manager', 'department_manager'), KPIController.createKPI);

// Cập nhật chi tiết KPI (Admin / HR Manager / Department Manager)
router.put('/:id', roleMiddleware('admin', 'hr_manager', 'department_manager'), KPIController.updateKPI);

// Xóa KPI (Admin / HR Manager)
router.delete('/:id', roleMiddleware('admin', 'hr_manager'), KPIController.deleteKPI);

module.exports = router;
