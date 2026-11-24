const express = require('express');
const ChatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Thiết lập Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Lấy lịch sử nhắn tin với 1 người hoặc bot
router.get('/history/:partnerId', authMiddleware, ChatController.getHistory);

// Gửi tin nhắn (cho những user thích dùng API thay vì gửi thẳng qua Socket)
router.post('/send', authMiddleware, ChatController.sendMessage);

// Upload ảnh
router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Không có file' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Xử lý giọng nói
router.post('/parse-voice', authMiddleware, ChatController.parseVoiceCommand);

module.exports = router;
