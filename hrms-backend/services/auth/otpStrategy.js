/**
 * =========================================================================
 * DESIGN PATTERN: STRATEGY PATTERN (Chiến lược gửi OTP / Thông báo)
 * =========================================================================
 * 
 * Mục đích:
 * - Đóng gói các thuật toán / phương thức gửi OTP (Email, Telegram, SMS, Zalo...)
 *   thành các class độc lập cùng triển khai một Interface chung (OtpDeliveryStrategy).
 * - Tuân thủ nguyên lý Open/Closed Principle (OCP):
 *   + Mở để mở rộng (Open for extension): Thêm phương thức mới (ví dụ SMS) chỉ cần tạo class
 *     mới kế thừa OtpDeliveryStrategy và đăng ký vào OtpDeliveryContext.
 *   + Đóng để sửa đổi (Closed for modification): Không cần sửa đổi if/else ở Controller
 *     hay Service hiện tại.
 * 
 * Cấu trúc:
 * 1. OtpDeliveryStrategy (Strategy Interface/Base Class)
 * 2. EmailOtpStrategy (Concrete Strategy)
 * 3. TelegramOtpStrategy (Concrete Strategy)
 * 4. OtpDeliveryContext (Context quản lý & thực thi Strategy theo runtime)
 */

const AuthNotificationFacade = require('./authNotificationFacade');

/**
 * 1. Strategy Interface / Base Class
 */
class OtpDeliveryStrategy {
  /**
   * Phương thức gửi mã OTP đến người dùng
   * @param {object} user - Instance của Employee model
   * @param {string} otp - Mã OTP gồm 6 chữ số
   * @returns {Promise<string>} Thông báo kết quả gửi thành công
   */
  async sendOtp(user, otp) {
    throw new Error('Phương thức sendOtp() phải được triển khai bởi lớp con (Concrete Strategy)!');
  }
}

/**
 * 2. Concrete Strategy: Gửi OTP qua Email
 */
class EmailOtpStrategy extends OtpDeliveryStrategy {
  async sendOtp(user, otp) {
    await AuthNotificationFacade.sendPasswordOtpEmail(user, otp);
    return 'OTP đã được gửi đến Email của bạn.';
  }
}

/**
 * 3. Concrete Strategy: Gửi OTP qua Telegram Bot
 */
class TelegramOtpStrategy extends OtpDeliveryStrategy {
  async sendOtp(user, otp) {
    const isSent = AuthNotificationFacade.sendPasswordOtpTelegram(user, otp);
    if (!isSent) {
      throw { status: 400, message: 'Hệ thống Telegram chưa sẵn sàng.' };
    }
    return 'OTP đã được gửi đến Telegram của bạn.';
  }
}

/**
 * 4. Context: Lớp điều phối và ủy thác việc gửi OTP cho Strategy tương ứng
 */
class OtpDeliveryContext {
  constructor() {
    this.strategies = new Map();
    // Đăng ký mặc định các chiến lược đang hỗ trợ
    this.registerStrategy('email', new EmailOtpStrategy());
    this.registerStrategy('telegram', new TelegramOtpStrategy());
  }

  /**
   * Đăng ký thêm chiến lược gửi OTP mới (OCP)
   * @param {string} method - Tên định danh (vd: 'sms', 'zalo')
   * @param {OtpDeliveryStrategy} strategy - Instance của OtpDeliveryStrategy
   */
  registerStrategy(method, strategy) {
    if (!strategy || typeof strategy.sendOtp !== 'function') {
      throw new Error(`Strategy cho method "${method}" phải cài đặt hàm sendOtp()`);
    }
    this.strategies.set(method.toLowerCase(), strategy);
  }

  /**
   * Kiểm tra xem phương thức có được hỗ trợ hay không
   */
  hasStrategy(method) {
    return Boolean(method && this.strategies.has(method.toLowerCase()));
  }

  /**
   * Thực thi gửi OTP thông qua chiến lược phù hợp
   * @param {string} method - 'email' | 'telegram' | ...
   * @param {object} user - Employee
   * @param {string} otp - Mã OTP
   * @returns {Promise<string>}
   */
  async deliverOtp(method, user, otp) {
    if (!method || !this.hasStrategy(method)) {
      throw { status: 400, message: 'Phương thức không hợp lệ' };
    }
    const strategy = this.strategies.get(method.toLowerCase());
    return await strategy.sendOtp(user, otp);
  }
}

// Khởi tạo instance singleton mặc định dùng chung cho ứng dụng
const defaultOtpContext = new OtpDeliveryContext();

module.exports = {
  OtpDeliveryStrategy,
  EmailOtpStrategy,
  TelegramOtpStrategy,
  OtpDeliveryContext,
  defaultOtpContext,
};
