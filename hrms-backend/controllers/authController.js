const AuthService = require('../services/auth/authService');

class AuthController {
  // Ham nay dung de tao ma captcha xac thuc hinh anh truoc khi dang nhap hoac dang ky
  // Giai thich code khong thuan: Su dung thu vien tao anh captcha dang SVG hoac base64 tra ve client
  static async getCaptcha(req, res) {
    try {
      const result = await AuthService.generateCaptcha();
      res.json(result);
    } catch (error) {
      console.error('Lỗi khi tạo captcha:', error);
      res.status(500).json({ message: 'Lỗi server khi tạo captcha' });
    }
  }

  // Ham nay dung de tiep nhan yeu cau dang ky tai khoan nhan vien moi vao he thong
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

  // Ham nay dung de xu ly dang nhap truyen thong bang username va mat khau
  // Giai thich code khong thuan: 
  // - req.app.get('io'): Lay instance Socket.io de phat tin hieu realtime neu can
  // - extensionActive: Kiem tra nhan vien co dang bat tien ich giam sat Chrome Extension hay khong
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

  // Ham nay dung de dang nhap sinh trac hoc bang nhan dien khuon mat
  // Giai thich code khong thuan:
  // - faceVector: Mang vector 128 chieu duoc extract tu camera client
  // - So khop voi vector goc da ma hoa trong database bang thuat toan Euclidean Distance
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

  // Ham nay dung de gui ma OTP ve Telegram cua nhan vien de xac minh truoc khi dang ky FaceID
  // Giai thich code khong thuan: Lay userId tu JWT payload qua middleware de dam bao tinh bao mat 2FA
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

  // Ham nay dung de luu vector khuon mat moi cua nhan vien sau khi da xac thuc ma OTP hop le
  // Giai thich code khong thuan: Du lieu vector se duoc ma hoa AES-256 truoc khi luu vao CSDL
  static async registerFace(req, res) {
    try {
      const { employeeId, faceVector, otp } = req.body;
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

  // Ham nay dung de dang xuat khoi he thong
  static async logout(req, res) {
    res.status(200).json({ message: 'Đăng xuất thành công' });
  }

  // Ham nay dung de tao va gui ma OTP xac nhan khi nguoi dung yeu cau doi mat khau
  // Giai thich code khong thuan: Ho tro gui OTP qua Telegram hoac Email tuy theo tham so method
  static async requestPasswordUpdateOTP(req, res) {
    try {
      const userId = req.user.id;
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

  // Ham nay dung de xac thuc OTP va cap nhat mat khau moi cho nguoi dung
  // Giai thich code khong thuan: Bam mat khau moi bang bcrypt va thong bao realtime qua socket de huy session cu
  static async updatePassword(req, res) {
    try {
      const userId = req.user.id;
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
