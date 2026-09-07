const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/captcha', AuthController.getCaptcha);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/login-face', AuthController.loginFace);

// Protected routes (require token)
router.post('/request-face-otp', authMiddleware, AuthController.requestFaceOtp);
// register-face API cũ gửi employeeId trong body thay vì lấy qua token, 
// nhưng thường gọi sau khi requestFaceOtp nên cũng cần đăng nhập
router.post('/register-face', authMiddleware, AuthController.registerFace);

router.post('/logout', authMiddleware, AuthController.logout);

router.post('/request-otp-update-password', authMiddleware, AuthController.requestPasswordUpdateOTP);
router.post('/update-password', authMiddleware, AuthController.updatePassword);

module.exports = router;
