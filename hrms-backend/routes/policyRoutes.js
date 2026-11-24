const express = require('express');
const policyController = require('../controllers/policyController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Lấy danh sách chính sách (User thấy chính sách được cấp quyền, Admin thấy tất cả)
router.get('/', policyController.getPolicies);

// Tạo chính sách mới (Admin & HR Manager)
router.post('/', roleMiddleware(['admin', 'hr_manager']), policyController.createPolicy);

// Cập nhật chính sách (Admin & HR Manager)
router.put('/:id', roleMiddleware(['admin', 'hr_manager']), policyController.updatePolicy);

// Xóa chính sách (Admin & HR Manager)
router.delete('/:id', roleMiddleware(['admin', 'hr_manager']), policyController.deletePolicy);

// Trích xuất chữ từ ảnh/file bằng Gemini AI OCR (Admin & HR Manager)
router.post('/extract-text', roleMiddleware(['admin', 'hr_manager']), policyController.extractText);

// Hỏi AI về 1 chính sách cụ thể (Kiểm tra quyền truy cập Role trong controller)
router.post('/:id/ask-ai', policyController.askAIPolicy);

module.exports = router;
