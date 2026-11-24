const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const documentCategoryController = require('../controllers/documentCategoryController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Dùng memoryStorage để OCR buffer ngay trên memory

router.use(authMiddleware);

// -- Quản lý danh mục (Categories) --
// Mọi nhân viên đã đăng nhập được xem cây danh mục
router.get('/categories', documentCategoryController.getCategories);

// Chỉ Admin, HR Manager, Department Manager mới được tạo/sửa danh mục
router.post('/categories', roleMiddleware('admin', 'hr_manager', 'department_manager'), documentCategoryController.createCategory);
router.put('/categories/:id', roleMiddleware('admin', 'hr_manager', 'department_manager'), documentCategoryController.updateCategory);

// Chỉ Admin mới được quyền xóa danh mục
router.delete('/categories/:id', roleMiddleware('admin', 'hr_manager'), documentCategoryController.deleteCategory);

// -- Quản lý tài liệu (Documents) --
// Lấy danh sách tài liệu & Tìm kiếm (phân quyền tại tầng SQL)
router.get('/', documentController.getDocuments);

// Upload tài liệu mới — chỉ Admin, HR Manager, Department Manager được đăng tải
router.post('/', roleMiddleware('admin', 'hr_manager', 'department_manager'), upload.single('file'), documentController.createDocument);

// Tải file tài liệu an toàn (có kiểm tra quyền)
router.get('/:id/download', documentController.downloadDocument);

// Xem trực tuyến (Preview stream inline) có kiểm tra quyền
router.get('/:id/preview', documentController.previewDocument);

// Xem chi tiết tài liệu (Tăng view count)
router.put('/:id/view', documentController.viewDocument);

// Xóa tài liệu — chỉ Admin, HR Manager hoặc chủ sở hữu (kiểm tra thêm trong controller)
router.delete('/:id', documentController.deleteDocument);

// Hỏi đáp AI trực tiếp trên tài liệu
router.post('/:id/ask-ai', documentController.askAIDocument);

module.exports = router;
