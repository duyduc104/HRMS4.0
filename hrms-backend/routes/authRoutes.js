const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────
router.get('/captcha', AuthController.getCaptcha);

// Đăng ký tự do — luôn chỉ tạo tài khoản với role 'employee'
router.post('/register', AuthController.register);

router.post('/login', AuthController.login);
router.post('/login-face', AuthController.loginFace);

// ─── PROTECTED ROUTES (require token) ───────────────────────────────────────
router.post('/request-face-otp', authMiddleware, AuthController.requestFaceOtp);
// register-face API cũ gửi employeeId trong body thay vì lấy qua token,
// nhưng thường gọi sau khi requestFaceOtp nên cũng cần đăng nhập
router.post('/register-face', authMiddleware, AuthController.registerFace);

router.post('/logout', authMiddleware, AuthController.logout);

router.post('/request-otp-update-password', authMiddleware, AuthController.requestPasswordUpdateOTP);
router.post('/update-password', authMiddleware, AuthController.updatePassword);

// ─── ADMIN ONLY ──────────────────────────────────────────────────────────────
// Tạo tài khoản với role bất kỳ (hr_manager, department_manager, admin, employee)
// Chỉ admin mới được gọi endpoint này
router.post(
  '/admin/create-employee',
  authMiddleware,
  roleMiddleware('admin'),
  AuthController.adminCreateEmployee
);

module.exports = router;
