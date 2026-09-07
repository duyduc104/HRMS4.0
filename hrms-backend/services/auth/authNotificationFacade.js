const telegramBot = require('../../services/telegramBot');
const EmailService = require('../../services/emailService');

class AuthNotificationFacade {
  /**
   * Cảnh báo đăng nhập bằng Telegram
   */
  static notifyLogin(user, time, isFaceLogin = false, image = null) {
    if (!telegramBot || typeof telegramBot.notifyUserAction !== 'function') {
      return;
    }
    if (isFaceLogin) {
      const imgToSend = image || 'https://cdn-icons-png.flaticon.com/512/3063/3063229.png';
      telegramBot.notifyUserAction(
        user.id,
        `👤 <b>ĐĂNG NHẬP KHUÔN MẶT</b>\nTài khoản của bạn vừa đăng nhập vào hệ thống bằng nhận diện khuôn mặt.\n- Thời gian: ${time}`,
        imgToSend
      );
    } else {
      telegramBot.notifyUserAction(
        user.id,
        `🔐 <b>CẢNH BÁO BẢO MẬT</b>\nTài khoản của bạn vừa đăng nhập vào hệ thống Web HRMS (bằng mật khẩu).\n- Thời gian: ${time}`,
        'https://cdn-icons-png.flaticon.com/512/295/295128.png'
      );
    }
  }

  /**
   * Gửi OTP FaceID qua Telegram
   */
  static sendFaceIDOtp(user, otp) {
    if (telegramBot && typeof telegramBot.notifyUserAction === 'function') {
      telegramBot.notifyUserAction(
        user.id,
        `🔐 <b>MÃ OTP ĐĂNG KÝ FACE ID</b>\nMã xác nhận cài đặt FaceID của bạn là: <tg-spoiler>${otp}</tg-spoiler>\nMã này sẽ hết hạn trong 5 phút. Vui lòng không chia sẻ cho ai.`
      );
      return true;
    }
    return false;
  }

  /**
   * Gửi OTP Đổi mật khẩu qua Email
   */
  static async sendPasswordOtpEmail(user, otp) {
    const emailBody = `<h3>Yêu cầu đổi mật khẩu</h3><p>Mã OTP của bạn là: <b>${otp}</b>. Mã này sẽ hết hạn trong 5 phút.</p>`;
    await EmailService.sendMail(user.email, 'Mã OTP Đổi Mật Khẩu HRMS', emailBody);
  }

  /**
   * Gửi OTP Đổi mật khẩu qua Telegram
   */
  static sendPasswordOtpTelegram(user, otp) {
    if (telegramBot && typeof telegramBot.notifyUserAction === 'function') {
      telegramBot.notifyUserAction(
        user.id,
        `🔐 <b>MÃ OTP ĐỔI MẬT KHẨU</b>\nMã OTP của bạn là: <code>${otp}</code>\nMã này sẽ hết hạn trong 5 phút. Vui lòng không chia sẻ cho ai.`
      );
      return true;
    }
    return false;
  }

  /**
   * Gửi cảnh báo đổi mật khẩu thành công qua Telegram
   */
  static notifyPasswordChanged(user, time) {
    if (telegramBot && typeof telegramBot.notifyUserAction === 'function') {
      telegramBot.notifyUserAction(
        user.id,
        `🔐 <b>CẢNH BÁO BẢO MẬT</b>\nMật khẩu của bạn vừa được thay đổi thành công vào lúc ${time}. Nếu không phải bạn thực hiện, vui lòng liên hệ Admin ngay!`
      );
    }
  }

  /**
   * Ép đăng xuất (Force logout) các thiết bị khác bằng Socket.IO
   */
  static forceLogoutOtherSessions(io, userId, loginTime, message) {
    if (io) {
      io.to(userId.toString()).emit('force_logout', {
        employeeId: userId,
        loginTime,
        message,
      });
    }
  }
}

module.exports = AuthNotificationFacade;
