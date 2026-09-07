const AuthService = require('../services/auth/authService');

class AuthController {
  // 1. Lấy Captcha
  static async getCaptcha(req, res) {
    try {
      const result = await AuthService.generateCaptcha();
      res.json(result);
    } catch (error) {
      console.error('Lỗi khi tạo captcha:', error);
      res.status(500).json({ message: 'Lỗi server khi tạo captcha' });
    }
  }

  // 2. Đăng ký nhân viên mới
  static async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ message: 'Đăng ký thành công', user: result });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('Lỗi server khi đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
  }

  // 3. Đăng nhập truyền thống
  static async login(req, res) {
    try {
      const { username, password, extensionActive } = req.body;
      const io = req.app.get('io');
      const result = await AuthService.login(username, password, extensionActive, io);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message, errorCode: error.errorCode });
      }
      console.error('Lỗi server login:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // 4. Đăng nhập bằng Khuôn mặt (Vector)
  static async loginFace(req, res) {
    try {
      const { username, faceVector, image, extensionActive } = req.body;
      const io = req.app.get('io');
      const result = await AuthService.loginFace(username, faceVector, image, extensionActive, io);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message, errorCode: error.errorCode });
      }
      console.error('[LoginFace] ❌ Server error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // 5. Yêu cầu OTP để đăng ký FaceID
  static async requestFaceOtp(req, res) {
    try {
      const userId = req.user.id; // Lấy từ authMiddleware
      await AuthService.requestFaceOtp(userId);
      res.status(200).json({ message: 'OTP đã được gửi đến Telegram của bạn.' });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('[requestFaceOtp]', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // 6. Đăng ký/Cập nhật lại Vector Khuôn mặt (Cho nhân viên đã tồn tại)
  static async registerFace(req, res) {
    try {
      const { employeeId, faceVector, otp } = req.body;
      // Dùng authMiddleware nên employeeId truyền từ body có thể thay bằng req.user.id nếu muốn, 
      // nhưng giữ nguyên theo body cho tương thích API cũ.
      await AuthService.registerFace(employeeId, faceVector, otp);
      res.status(200).json({ message: 'Đăng ký khuôn mặt thành công' });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('[registerFace]', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // 7. Đăng xuất
  static async logout(req, res) {
    res.status(200).json({ message: 'Đăng xuất thành công' });
  }

  // 8. Yêu cầu OTP đổi mật khẩu
  static async requestPasswordUpdateOTP(req, res) {
    try {
      const userId = req.user.id; // Từ authMiddleware
      const { method, currentPassword } = req.body;
      const message = await AuthService.requestPasswordUpdateOTP(userId, method, currentPassword);
      res.status(200).json({ message });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('[requestPasswordUpdateOTP]', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // 9. Cập nhật mật khẩu
  static async updatePassword(req, res) {
    try {
      const userId = req.user.id; // Từ authMiddleware
      const { currentPassword, newPassword, otp } = req.body;
      const io = req.app.get('io');
      
      await AuthService.updatePassword(userId, currentPassword, newPassword, otp, io);
      res.status(200).json({ message: 'Cập nhật mật khẩu thành công.' });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('[updatePassword]', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
}

module.exports = AuthController;
