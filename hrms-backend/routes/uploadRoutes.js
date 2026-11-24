const express = require('express');
const multer = require('multer');
const path = require('path');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Dùng multer để nhận file (chỉ cần lưu tạm ở hệ điều hành rồi ta sẽ chuyển vào thư mục temp)
const upload = multer({ dest: path.join(__dirname, '../public/uploads/temp') });

router.post('/chunk', authMiddleware, upload.single('chunk'), uploadController.uploadChunk);
router.post('/merge', authMiddleware, uploadController.mergeChunks);

module.exports = router;
