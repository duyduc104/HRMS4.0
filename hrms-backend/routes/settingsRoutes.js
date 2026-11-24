const express = require('express');
const { Setting } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Lấy danh sách toàn bộ cấu hình hệ thống
router.get('/', authMiddleware, async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Cập nhật cấu hình (Chỉ Admin)
router.post('/', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const updates = req.body; // Expect { OFFICE_LAT: '21.01595', OFFICE_LNG: '105.85526', ... }
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null) {
        await Setting.upsert({
          key,
          value: value.toString(),
        });
      }
    }
    
    res.json({ message: 'Cập nhật cấu hình thành công' });
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
