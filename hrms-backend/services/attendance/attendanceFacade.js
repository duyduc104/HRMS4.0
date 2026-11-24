/**
 * =========================================================================
 * DESIGN PATTERN: FACADE PATTERN (Mặt tiền hệ thống Chấm công đa thành phần)
 * =========================================================================
 * 
 * Mục đích:
 * - Cung cấp một giao diện đơn giản, thống nhất (Unified Interface) cho quy trình
 *   Chấm công (Attendance), vốn tích hợp rất nhiều hệ thống con (Subsystems) phức tạp:
 *   1. FaceBiometricSubsystem: Giải mã AES-256 vector gốc, so khớp cosine Face ID (0.60), cấp verifyToken 2 phút.
 *   2. GeofenceSubsystem: Định vị GPS, tính khoảng cách Haversine tới toạ độ văn phòng, kiểm tra bán kính cho phép.
 *   3. ExtensionMonitorSubsystem: Giám sát Heartbeat của Chrome Extension lọc web (ngưỡng 5 phút).
 *   4. AttendancePersistenceSubsystem: Truy vấn & lưu trữ trạng thái chấm công vào/ra (Late/Present).
 *   5. AttendanceNotifierSubsystem: Gửi thông báo tức thì qua Telegram Bot & cảnh báo vi phạm tháng qua Socket.IO.
 * 
 * Lợi ích:
 * - Giảm sự phụ thuộc (Decoupling): AttendanceController không còn bị gắn chặt với 7 thư viện / model khác nhau.
 * - Dễ bảo trì & Kiểm thử: Từng Subsystem có thể kiểm thử độc lập mà không ảnh hưởng luồng nghiệp vụ chính.
 */

const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Attendance = require('../../models/Attendance');
const Employee = require('../../models/Employee');
const ExtensionHeartbeat = require('../../models/ExtensionHeartbeat');
const Setting = require('../../models/Setting');
const { getVietnamDate } = require('../../utils/dateUtils');
const CryptoService = require('../cryptoService');
const FaceVectorService = require('../faceVectorService');
const telegramBot = require('../telegramBot');
const { getDistanceFromLatLonInMeters } = require('../../utils/geoUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const DEFAULT_OFFICE_LAT = 21.01595;
const DEFAULT_OFFICE_LNG = 105.85526;
const DEFAULT_ALLOWED_RADIUS = 1000;

/**
 * -------------------------------------------------------------
 * 1. Subsystem: Sinh trắc học khuôn mặt & Xác thực bảo mật 2 bước
 * -------------------------------------------------------------
 */
class FaceBiometricSubsystem {
  /**
   * So khớp vector khuôn mặt và cấp verifyToken tạm thời
   */
  static async verifyFace(userId, faceVector) {
    if (!faceVector || !Array.isArray(faceVector) || faceVector.length === 0) {
      throw { status: 400, message: 'Dữ liệu khuôn mặt không hợp lệ' };
    }

    const user = await Employee.findByPk(userId);
    if (!user || !user.faceEncoding || !user.faceEncodingIV) {
      throw { status: 400, message: 'Bạn chưa đăng ký Face ID.' };
    }

    const decryptedString = CryptoService.decrypt(user.faceEncoding, user.faceEncodingIV);
    if (!decryptedString) {
      throw { status: 500, message: 'Lỗi giải mã khuôn mặt' };
    }

    let storedVector;
    try {
      storedVector = JSON.parse(decryptedString);
    } catch (parseErr) {
      throw { status: 500, message: 'Dữ liệu khuôn mặt bị hỏng' };
    }

    // Ngưỡng 0.60 theo quy định
    const isMatch = FaceVectorService.compareFace(faceVector, storedVector, 0.60);
    if (!isMatch) {
      throw { status: 401, message: 'Khuôn mặt không khớp!' };
    }

    // Cấp verifyToken có hiệu lực 2 phút
    const verifyToken = jwt.sign({ id: userId, verified: true }, JWT_SECRET, { expiresIn: '2m' });
    return { message: 'Khuôn mặt hợp lệ', verifyToken };
  }

  /**
   * Kiểm tra tính hợp lệ của verifyToken trước khi check-in / check-out
   */
  static verifyTemporaryToken(verifyToken, userId) {
    if (!verifyToken) {
      throw { status: 400, message: 'Thiếu token xác minh khuôn mặt' };
    }

    try {
      const decoded = jwt.verify(verifyToken, JWT_SECRET);
      if (decoded.id !== userId || !decoded.verified) {
        throw new Error('Invalid token');
      }
      return decoded;
    } catch (err) {
      throw { status: 401, message: 'Xác minh khuôn mặt thất bại hoặc đã hết hạn. Vui lòng thử lại.' };
    }
  }
}

/**
 * -------------------------------------------------------------
 * 2. Subsystem: Định vị địa lý văn phòng (GPS Geofencing)
 * -------------------------------------------------------------
 */
class GeofenceSubsystem {
  static async validateLocation(user, latitude, longitude) {
    if (user.allowRemoteAttendance) {
      return { exempted: true };
    }

    if (!latitude || !longitude) {
      throw { status: 403, message: 'Vui lòng cấp quyền truy cập Vị trí (GPS) để chấm công!' };
    }

    // Lấy cài đặt toạ độ văn phòng từ DB (nếu có) hoặc fallback mặc định
    const latSetting = await Setting.findByPk('OFFICE_LAT');
    const lngSetting = await Setting.findByPk('OFFICE_LNG');
    const radiusSetting = await Setting.findByPk('ALLOWED_RADIUS');

    const officeLat = latSetting ? parseFloat(latSetting.value) : DEFAULT_OFFICE_LAT;
    const officeLng = lngSetting ? parseFloat(lngSetting.value) : DEFAULT_OFFICE_LNG;
    const allowedRadius = radiusSetting ? parseInt(radiusSetting.value) : DEFAULT_ALLOWED_RADIUS;

    const distance = getDistanceFromLatLonInMeters(latitude, longitude, officeLat, officeLng);
    console.log(`[Attendance] User ${user.fullName} distance to office: ${distance}m`);

    if (distance > allowedRadius) {
      throw {
        status: 403,
        message: `Bạn đang ở cách công ty ${Math.round(distance)}m. Vui lòng di chuyển vào khu vực văn phòng! (Cho phép: ${allowedRadius}m)`
      };
    }

    return { distance, allowedRadius };
  }
}

/**
 * -------------------------------------------------------------
 * 3. Subsystem: Giám sát hoạt động Chrome Extension
 * -------------------------------------------------------------
 */
class ExtensionMonitorSubsystem {
  static async validateExtensionActive(userId, userRoles = []) {
    const isAdmin = userRoles.includes('admin');
    if (isAdmin) {
      return { exempted: true };
    }

    const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 phút
    const heartbeat = await ExtensionHeartbeat.findOne({ where: { employeeId: userId } });

    if (!heartbeat) {
      throw {
        status: 403,
        message: 'Bạn chưa cài Extension HRMS Web Filter! Vui lòng cài đặt extension trên trình duyệt trước khi chấm công.',
        code: 'EXTENSION_NOT_INSTALLED'
      };
    }

    const timeDiff = new Date() - new Date(heartbeat.lastPing);
    if (timeDiff > OFFLINE_THRESHOLD) {
      throw {
        status: 403,
        message: 'Extension HRMS Web Filter không hoạt động! Vui lòng bật extension và đăng nhập trước khi chấm công.',
        code: 'EXTENSION_OFFLINE'
      };
    }

    return { active: true };
  }
}

/**
 * -------------------------------------------------------------
 * 4. Subsystem: Thông báo & Cảnh báo vi phạm (Telegram + Socket.IO)
 * -------------------------------------------------------------
 */
class AttendanceNotifierSubsystem {
  static notifyCheckIn(userId, status, now, image) {
    if (telegramBot && typeof telegramBot.notifyUserAction === 'function') {
      const statusText = status === 'Late' ? '⚠️ Đi trễ' : '✅ Đúng giờ';
      const imgToSend = image || 'https://cdn-icons-png.flaticon.com/512/3592/3592881.png';
      telegramBot.notifyUserAction(
        userId,
        `📍 <b>THÔNG BÁO CHẤM CÔNG (VÀO)</b>\nBạn vừa Check-in bằng khuôn mặt thành công.\n- Trạng thái: ${statusText}\n- Thời gian: ${now.toLocaleTimeString('vi-VN')}`,
        imgToSend
      );
    }
  }

  static notifyCheckOut(userId, now, image) {
    if (telegramBot && typeof telegramBot.notifyUserAction === 'function') {
      const imgToSend = image || 'https://cdn-icons-png.flaticon.com/512/3592/3592878.png';
      telegramBot.notifyUserAction(
        userId,
        `👋 <b>THÔNG BÁO CHẤM CÔNG (RA)</b>\nBạn vừa Check-out ra về thành công.\n- Thời gian: ${now.toLocaleTimeString('vi-VN')}\nChúc bạn nghỉ ngơi vui vẻ!`,
        imgToSend
      );
    }
  }

  static async evaluateAndSendWarnings(userId, now, io) {
    try {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      const monthStats = await Attendance.findAll({
        where: {
          employeeId: userId,
          date: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      const lateCount = monthStats.filter(r => r.status === 'Late').length;
      const absentCount = monthStats.filter(r => r.status === 'Absent').length;
      const todayStrLocal = getVietnamDate();
      const missingCheckoutCount = monthStats.filter(r => r.checkInTime && !r.checkOutTime && r.date < todayStrLocal).length;

      if (lateCount >= 3 || absentCount >= 5 || missingCheckoutCount >= 3) {
        let warningReason = [];
        if (lateCount >= 3) warningReason.push(`Đi trễ ${lateCount} lần`);
        if (absentCount >= 5) warningReason.push(`Vắng mặt ${absentCount} lần`);
        if (missingCheckoutCount >= 3) warningReason.push(`Quên chấm công ra ${missingCheckoutCount} lần`);

        const warningMsg = `Bạn đã ${warningReason.join(' và ')} trong tháng này!`;

        // Gửi Realtime Socket
        if (io) {
          io.to(userId.toString()).emit('hrms_attendance_warning', {
            message: warningMsg,
            lateCount,
            absentCount,
            missingCheckoutCount
          });
        }

        // Gửi Telegram Bot
        if (telegramBot && typeof telegramBot.notifyUserAction === 'function') {
          telegramBot.notifyUserAction(
            userId,
            `🚨 <b>CẢNH BÁO VI PHẠM CHẤM CÔNG</b>\n${warningMsg}\nVui lòng chú ý thời gian làm việc để không ảnh hưởng đến đánh giá thi đua!`
          );
        }
      }
    } catch (warnErr) {
      console.error('[AttendanceFacade] Warning check error:', warnErr);
    }
  }
}

/**
 * =============================================================
 * 5. FACADE CLASS: ATTENDANCE FACADE
 * =============================================================
 * Giao diện hợp nhất duy nhất cho Controller gọi đến
 */
class AttendanceFacade {
  /**
   * Facade Method 1: Xác minh khuôn mặt (Face Verification)
   */
  static async verifyFace({ userId, faceVector }) {
    return await FaceBiometricSubsystem.verifyFace(userId, faceVector);
  }

  /**
   * Facade Method 2: Điều phối toàn bộ quy trình Chấm công vào (Check-in)
   */
  static async checkIn({ userId, userRoles = [], verifyToken, latitude, longitude, image, io }) {
    console.log(`[Attendance] Check-in attempt for user ID: ${userId}, Location: ${latitude}, ${longitude}`);

    // Bước 1: Kiểm tra tính hợp lệ của token xác minh sinh trắc học
    FaceBiometricSubsystem.verifyTemporaryToken(verifyToken, userId);

    // Bước 2: Tải thông tin người dùng
    const user = await Employee.findByPk(userId);
    if (!user) {
      throw { status: 404, message: 'Không tìm thấy nhân viên' };
    }

    // Bước 3: Kiểm tra định vị GPS Geofencing
    await GeofenceSubsystem.validateLocation(user, latitude, longitude);

    // Bước 4: Kiểm tra trạng thái hoạt động của Extension
    await ExtensionMonitorSubsystem.validateExtensionActive(userId, userRoles);

    // Bước 5: Kiểm tra tránh trùng lặp chấm công hôm nay (Múi giờ Việt Nam UTC+7)
    const today = getVietnamDate();
    const existingRecord = await Attendance.findOne({
      where: {
        employeeId: userId,
        date: today,
      }
    });

    if (existingRecord && existingRecord.checkInTime) {
      throw {
        status: 400,
        message: 'Bạn đã chấm công vào hôm nay rồi!',
        data: { attendance: existingRecord }
      };
    }

    // Bước 6: Xác định trạng thái đi làm (đến sau 8:30 tính là Late)
    const now = new Date();
    const checkInHour = now.getHours();
    const checkInMinute = now.getMinutes();
    let status = 'Present';
    if (checkInHour > 8 || (checkInHour === 8 && checkInMinute > 30)) {
      status = 'Late';
    }

    // Bước 7: Lưu bản ghi chấm công vào CSDL
    const attendance = await Attendance.create({
      employeeId: userId,
      date: today,
      checkInTime: now,
      status: status,
      notes: 'Chấm công bằng nhận diện khuôn mặt',
    });

    console.log(`[Attendance] ✅ Check-in successful for ${user.fullName} at ${now.toLocaleTimeString()}`);

    // Bước 8: Gửi thông báo Telegram
    AttendanceNotifierSubsystem.notifyCheckIn(userId, status, now, image);

    // Bước 9: Kiểm tra và phát cảnh báo vi phạm tháng (Realtime Socket + Telegram)
    await AttendanceNotifierSubsystem.evaluateAndSendWarnings(userId, now, io);

    return {
      message: 'Chấm công vào thành công!',
      attendance: {
        id: attendance.id,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
      }
    };
  }

  /**
   * Facade Method 3: Điều phối quy trình Chấm công ra (Check-out)
   */
  static async checkOut({ userId, verifyToken, latitude, longitude, image }) {
    console.log(`[Attendance] Check-out attempt for user ID: ${userId}, Location: ${latitude}, ${longitude}`);

    // Bước 1: Kiểm tra tính hợp lệ của token xác minh sinh trắc học
    FaceBiometricSubsystem.verifyTemporaryToken(verifyToken, userId);

    // Bước 2: Tải thông tin người dùng
    const user = await Employee.findByPk(userId);
    if (!user) {
      throw { status: 400, message: 'Không tìm thấy người dùng' };
    }

    // Bước 3: Kiểm tra định vị GPS Geofencing
    await GeofenceSubsystem.validateLocation(user, latitude, longitude);

    // Bước 4: Kiểm tra bản ghi chấm công hợp lệ hôm nay (Múi giờ Việt Nam UTC+7)
    const today = getVietnamDate();
    const attendance = await Attendance.findOne({
      where: {
        employeeId: userId,
        date: today,
      }
    });

    if (!attendance || !attendance.checkInTime) {
      throw { status: 400, message: 'Bạn chưa chấm công vào hôm nay!' };
    }

    if (attendance.checkOutTime) {
      throw { status: 400, message: 'Bạn đã chấm công ra hôm nay rồi!' };
    }

    // Bước 5: Cập nhật giờ ra và lưu DB
    const now = new Date();
    attendance.checkOutTime = now;
    await attendance.save();

    console.log(`[Attendance] ✅ Check-out successful for ${user.fullName} at ${now.toLocaleTimeString()}`);

    // Bước 6: Gửi thông báo Telegram
    AttendanceNotifierSubsystem.notifyCheckOut(userId, now, image);

    return {
      message: 'Chấm công ra thành công!',
      attendance: {
        id: attendance.id,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
      }
    };
  }
}

module.exports = {
  AttendanceFacade,
  FaceBiometricSubsystem,
  GeofenceSubsystem,
  ExtensionMonitorSubsystem,
  AttendanceNotifierSubsystem,
};
