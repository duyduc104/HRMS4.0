const express = require('express');
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Lấy danh sách Menu công khai cho Sidebar (User)
router.get('/', menuController.getPublicMenus);

// Lấy tất cả danh sách Menu cho Admin quản lý
router.get('/admin', roleMiddleware(['admin']), menuController.getAllMenus);

// Tạo mới Menu Item (Admin)
router.post('/', roleMiddleware(['admin']), menuController.createMenuItem);

// Sắp xếp lại thứ tự Menu
router.post('/reorder', roleMiddleware(['admin']), menuController.reorderMenus);

// Cập nhật thông tin Menu Item
router.put('/:id', roleMiddleware(['admin']), menuController.updateMenuItem);

// Xóa Menu Item
router.delete('/:id', roleMiddleware(['admin']), menuController.deleteMenuItem);

module.exports = router;
