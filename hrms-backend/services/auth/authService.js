const bcrypt = require('bcryptjs');
const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');
const Employee = require('../../models/Employee');
const Role = require('../../models/Role');
const ROLES = require('../../constants/roles');
const redisClient = require('../../config/redisClient');
const CryptoService = require('../../services/cryptoService');

const TokenService = require('./tokenService');
const AuthNotificationFacade = require('./authNotificationFacade');
const { PasswordLoginStrategy, FaceIDLoginStrategy } = require('./authStrategy');

class AuthService {
  /**
   * 1. Tạo Captcha
   */
  static async generateCaptcha() {
    const captcha = svgCaptcha.create({
      size: 5,
      ignoreChars: '0o1i',
      noise: 2,
      color: true,
    });

    const token = crypto.randomUUID();
    // Lưu vào Redis 3 phút
    await redisClient.set(`captcha:${token}`, captcha.text.toLowerCase(), 'EX', 180);

    return { token, svg: captcha.data };
  }

  /**
   * Xác minh Captcha
   */
  static async verifyCaptcha(captchaToken, captchaValue) {
    if (!captchaToken || !captchaValue) {
      throw { status: 400, message: 'Vui lòng nhập Captcha để xác minh' };
    }

    const storedCaptcha = await redisClient.get(`captcha:${captchaToken}`);
    if (!storedCaptcha) {
      throw { status: 400, message: 'Mã Captcha đã hết hạn, vui lòng tải lại ảnh mới' };
    }
    
    if (storedCaptcha !== captchaValue.toLowerCase()) {
      throw { status: 400, message: 'Mã Captcha không chính xác' };
    }

    // Xoá captcha sau khi dùng
    await redisClient.del(`captcha:${captchaToken}`);
  }

  /**
   * 2. Đăng ký nhân viên mới
   */
  static async register(data) {
    const { username, password, email, fullName, faceVector, captchaToken, captchaValue, code } = data;
    const employeeCode = code || `EMP-${Date.now()}`;

    await this.verifyCaptcha(captchaToken, captchaValue);

    const existingUser = await Employee.findOne({ where: { username } });
    if (existingUser) {
      throw { status: 400, message: 'Username đã tồn tại' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let encryptedFaceData = null;
    let faceDataIV = null;

    if (faceVector && Array.isArray(faceVector)) {
      const vectorString = JSON.stringify(faceVector);
      const { iv, encryptedData } = CryptoService.encrypt(vectorString);
      encryptedFaceData = encryptedData;
      faceDataIV = iv;
    }

    const newUser = await Employee.create({
      username,
      code: employeeCode,
      fullName,
      email,
      passwordHash,
      faceEncoding: encryptedFaceData,
      faceEncodingIV: faceDataIV,
    });

    const defaultRole = await Role.findOne({ where: { name: ROLES.EMPLOYEE } });
    if (defaultRole) {
      await newUser.addRole(defaultRole);
    }

    return { id: newUser.id, username: newUser.username };
  }

  /**
   * Helper xử lý chung sau khi xác thực thành công (tạo token, notify, force logout)
   */
  static async _handleLoginSuccess(user, requiresExt, io, isFaceLogin = false, image = null) {
    const userRoles = user.roles && user.roles.length > 0 ? user.roles.map(r => r.name) : [ROLES.EMPLOYEE];
    const primaryRole = userRoles[0];
    const loginTime = Date.now();

    // Notify Telegram
    AuthNotificationFacade.notifyLogin(user, new Date().toLocaleString('vi-VN'), isFaceLogin, image);

    // Force logout các phiên khác
    AuthNotificationFacade.forceLogoutOtherSessions(
      io, 
      user.id, 
      loginTime, 
      isFaceLogin ? 'Tài khoản của bạn vừa đăng nhập bằng Face ID ở một nơi khác.' : 'Tài khoản của bạn vừa đăng nhập ở một nơi khác (thiết bị hoặc trình duyệt mới).'
    );

    // Sinh Token
    const token = TokenService.generateAuthToken(user, loginTime, primaryRole, userRoles);

    return {
      message: isFaceLogin ? 'Login bằng Face thành công' : 'Login thành công',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: primaryRole,
        roles: userRoles,
        requiresExtension: requiresExt
      }
    };
  }

  /**
   * 3. Đăng nhập truyền thống
   */
  static async login(username, password, extensionActive, io) {
    const { user, requiresExt } = await PasswordLoginStrategy.authenticate(username, password, extensionActive);
    return this._handleLoginSuccess(user, requiresExt, io, false);
  }

  /**
   * 4. Đăng nhập bằng Khuôn mặt
   */
  static async loginFace(username, faceVector, image, extensionActive, io) {
    const { user, requiresExt } = await FaceIDLoginStrategy.authenticate(username, faceVector, extensionActive);
    return this._handleLoginSuccess(user, requiresExt, io, true, image);
  }

  /**
   * 5. Yêu cầu OTP để đăng ký FaceID
   */
  static async requestFaceOtp(userId) {
    const user = await Employee.findByPk(userId);
    if (!user) throw { status: 404, message: 'Không tìm thấy user' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `OTP_FACE_${user.id}`;
    await redisClient.setEx(redisKey, 300, otp);

    const isSent = AuthNotificationFacade.sendFaceIDOtp(user, otp);
    if (!isSent) {
      throw { status: 400, message: 'Hệ thống Telegram chưa sẵn sàng. Bạn phải kết nối bot Telegram trước.' };
    }
  }

  /**
   * 6. Cập nhật FaceID với OTP
   */
  static async registerFace(employeeId, faceVector, otp) {
    const user = await Employee.findByPk(employeeId);
    if (!user) throw { status: 404, message: 'Không tìm thấy nhân viên' };
    if (!otp) throw { status: 400, message: 'Vui lòng nhập mã OTP' };

    const redisKey = `OTP_FACE_${user.id}`;
    const savedOtp = await redisClient.get(redisKey);
    
    if (!savedOtp) throw { status: 400, message: 'Mã OTP đã hết hạn hoặc chưa được tạo' };
    if (savedOtp !== otp) throw { status: 400, message: 'Mã OTP không chính xác' };

    await redisClient.del(redisKey);

    const vectorString = JSON.stringify(faceVector);
    const { iv, encryptedData } = CryptoService.encrypt(vectorString);

    user.faceEncoding = encryptedData;
    user.faceEncodingIV = iv;
    await user.save();
  }

  /**
   * 7. Yêu cầu OTP đổi mật khẩu
   */
  static async requestPasswordUpdateOTP(userId, method, currentPassword) {
    const user = await Employee.findByPk(userId);
    if (!user) throw { status: 404, message: 'Không tìm thấy user' };
    if (!currentPassword) throw { status: 400, message: 'Vui lòng cung cấp mật khẩu hiện tại' };

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw { status: 400, message: 'Mật khẩu hiện tại không chính xác' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `OTP_PASSWORD_${user.id}`;
    await redisClient.setEx(redisKey, 180, otp); // 3 phút

    if (method === 'email') {
      await AuthNotificationFacade.sendPasswordOtpEmail(user, otp);
      return 'OTP đã được gửi đến Email của bạn.';
    } else if (method === 'telegram') {
      const isSent = AuthNotificationFacade.sendPasswordOtpTelegram(user, otp);
      if (!isSent) throw { status: 400, message: 'Hệ thống Telegram chưa sẵn sàng.' };
      return 'OTP đã được gửi đến Telegram của bạn.';
    } else {
      throw { status: 400, message: 'Phương thức không hợp lệ' };
    }
  }

  /**
   * 8. Cập nhật mật khẩu
   */
  static async updatePassword(userId, currentPassword, newPassword, otp, io) {
    const user = await Employee.findByPk(userId);
    if (!user) throw { status: 404, message: 'Không tìm thấy user' };

    const redisKey = `OTP_PASSWORD_${user.id}`;
    const savedOtp = await redisClient.get(redisKey);

    if (!savedOtp) throw { status: 400, message: 'OTP chưa được tạo hoặc đã hết hạn.' };
    if (savedOtp !== otp) throw { status: 400, message: 'OTP không chính xác.' };

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw { status: 400, message: 'Mật khẩu hiện tại không chính xác.' };

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await redisClient.del(redisKey);

    AuthNotificationFacade.notifyPasswordChanged(user, new Date().toLocaleString('vi-VN'));
    AuthNotificationFacade.forceLogoutOtherSessions(io, user.id, Date.now(), 'Mật khẩu của bạn vừa được thay đổi. Vui lòng đăng nhập lại.');
  }
}

module.exports = AuthService;
