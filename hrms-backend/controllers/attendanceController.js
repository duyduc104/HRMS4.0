const { Op } = require('sequelize');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const telegramBot = require('../services/telegramBot');
const { AttendanceFacade } = require('../services/attendance/attendanceFacade');
const { getVietnamDate } = require('../utils/dateUtils');

class AttendanceController {
  // Ham nay dung de xac minh khuon mat cua nhan vien truoc khi check-in hoac check-out (Bao mat 2 buoc)
  // Ap dung FACADE PATTERN thong qua AttendanceFacade.verifyFace()
  static async verifyFace(req, res) {
    try {
      const { faceVector } = req.body;
      const userId = req.user.id;

      const result = await AttendanceFacade.verifyFace({ userId, faceVector });
      return res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('[VerifyFace] Error:', error);
      return res.status(500).json({ message: 'Lỗi server khi xác minh khuôn mặt' });
    }
  }

  // Ham nay dung de ghi nhan cham cong vao ca (Check-in) cho nhan vien
  // Ap dung FACADE PATTERN: Uy thac toan bo viec dieu phoi cac he thong con
  // (FaceBiometric, GPS Geofencing, ExtensionMonitor, Persistence, Realtime Notification) cho AttendanceFacade.checkIn()
  static async checkIn(req, res) {
    try {
      const { verifyToken, image, latitude, longitude } = req.body;
      const userId = req.user.id;
      const userRoles = req.user.roles || [req.user.role];
      const io = req.app.get('io');

      const result = await AttendanceFacade.checkIn({
        userId,
        userRoles,
        verifyToken,
        latitude,
        longitude,
        image,
        io
      });

      return res.status(201).json(result);
    } catch (error) {
      if (error.status) {
        const payload = { message: error.message };
        if (error.code) payload.code = error.code;
        if (error.data) Object.assign(payload, error.data);
        return res.status(error.status).json(payload);
      }
      console.error('[Attendance] ❌ Check-in error:', error);
      return res.status(500).json({ message: 'Lỗi server khi chấm công' });
    }
  }

  // Ham nay dung de ghi nhan cham cong ra ca (Check-out) cho nhan vien
  // Ap dung FACADE PATTERN: Uy thac cho AttendanceFacade.checkOut()
  static async checkOut(req, res) {
    try {
      const { verifyToken, image, latitude, longitude } = req.body;
      const userId = req.user.id;

      const result = await AttendanceFacade.checkOut({
        userId,
        verifyToken,
        latitude,
        longitude,
        image
      });

      return res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        const payload = { message: error.message };
        if (error.code) payload.code = error.code;
        if (error.data) Object.assign(payload, error.data);
        return res.status(error.status).json(payload);
      }
      console.error('[Attendance] ❌ Check-out error:', error);
      return res.status(500).json({ message: 'Lỗi server khi chấm công ra' });
    }
  }

  // Ham nay dung de lay trang thai cham cong ngay hom nay cua nhan vien dang dang nhap (xem da vao/ra chua)
  static async getToday(req, res) {
    try {
      const userId = req.user.id;
      const today = getVietnamDate();

      const attendance = await Attendance.findOne({
        where: {
          employeeId: userId,
          date: today,
        }
      });

      res.status(200).json({
        attendance: attendance || null,
      });
    } catch (error) {
      console.error('[Attendance] ❌ Get today error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung de lay lich su cham cong chi tiet cua mot nhan vien theo thang/nam
  // Giai thich code khong thuan:
  // - Phan quyen: Nhan vien chi xem duoc cua minh, Admin xem duoc cua bat ky ai
  // - Ho tro loc theo danh sach ngay cu the trong thang (days=1,2,3)
  // - Tu dong gop danh sach cac ngay nghi phep da duyet (Leaves) tao thanh cac ban ghi ao (dummy records) de hien thi day du tren lich cham cong
  // Ham nay dung de lay lich su cham cong cua 1 nhan vien (Admin va HR xem duoc tat ca, Truong phong xem phong ban minh, nhan vien chi xem cua minh)
  static async getEmployeeHistory(req, res) {
    try {
      const now = new Date();
      let { employeeId, year, month, days } = req.query;
      
      const userRole = (req.user?.role || '').toLowerCase().replace(/\s+/g, '_');
      const userRoles = (req.user?.roles || []).map(r => 
        (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
      );
      const allRoles = [...new Set([userRole, ...userRoles])];
      const isAdmin = allRoles.includes('admin');
      const isHR = allRoles.includes('hr_manager');
      const isDeptManager = allRoles.includes('department_manager');

      // Phan quyen xem lich su cham cong:
      // - Admin & HR: Xem duoc bat ky ai
      // - Truong phong: Xem duoc nhan vien cung phong ban
      // - Nhan vien: Chi xem duoc cua chinh minh
      if (isAdmin || isHR) {
        employeeId = employeeId || req.user.id;
      } else if (isDeptManager) {
        if (employeeId && employeeId !== req.user.id) {
          const targetEmp = await Employee.findByPk(employeeId, { attributes: ['id', 'department'] });
          if (!targetEmp || (req.user.department && targetEmp.department !== req.user.department)) {
            return res.status(403).json({ 
              message: 'Trưởng phòng chỉ có thể xem lịch sử chấm công của nhân viên thuộc phòng ban mình quản lý' 
            });
          }
        } else {
          employeeId = req.user.id;
        }
      } else {
        employeeId = req.user.id;
      }
      
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      year = parseInt(year) || currentYear;
      month = parseInt(month) || currentMonth;
      
      // Giới hạn tối đa 3 năm trở về trước
      if (year < currentYear - 3) {
        return res.status(400).json({ message: 'Chỉ có thể xem dữ liệu tối đa 3 năm trở về trước' });
      }
      
      if (year > currentYear) {
        return res.status(400).json({ message: 'Năm không hợp lệ' });
      }
      
      if (month < 1 || month > 12) {
        return res.status(400).json({ message: 'Tháng không hợp lệ' });
      }

      // Tạo ngày bắt đầu và kết thúc của tháng
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Ngày cuối cùng của tháng
      
      const whereClause = {
        date: {
          [Op.between]: [
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ]
        }
      };
      
      if (employeeId) {
        whereClause.employeeId = employeeId;
      }

      // Nếu có filter theo ngày cụ thể (days = "1,5,10")
      if (days) {
        const daysArray = days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
        if (daysArray.length > 0) {
          const specificDates = daysArray.map(d => {
            // Đảm bảo format ngày là YYYY-MM-DD an toàn
            const padMonth = String(month).padStart(2, '0');
            const padDay = String(d).padStart(2, '0');
            return `${year}-${padMonth}-${padDay}`;
          });
          whereClause.date = {
            [Op.in]: specificDates
          };
        }
      }

      const records = await Attendance.findAll({
        where: whereClause,
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'fullName', 'code', 'department']
        }],
        order: [['date', 'DESC']],
      });

      // Lấy danh sách phép được duyệt trong tháng để đưa vào lịch
      const { Leave } = require('../models');
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      let leaveWhere = { status: 'Approved' };
      if (employeeId) {
        leaveWhere.employeeId = employeeId;
      }
      // Tìm các đơn nghỉ có giao nhau với tháng đang xem
      leaveWhere[Op.or] = [
        { startDate: { [Op.between]: [startDateStr, endDateStr] } },
        { endDate: { [Op.between]: [startDateStr, endDateStr] } },
        { 
          [Op.and]: [
            { startDate: { [Op.lt]: startDateStr } },
            { endDate: { [Op.gt]: endDateStr } }
          ]
        }
      ];

      const leaves = await Leave.findAll({
        where: leaveWhere,
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'fullName', 'code', 'department']
        }]
      });

      // Tạo các bản ghi giả (dummy records) cho những ngày nghỉ
      const leaveRecords = [];
      for (const leave of leaves) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        
        // Cắt bớt phần thời gian ra khỏi tháng hiện tại (nếu nghỉ vắt qua tháng)
        const monthStart = new Date(startDateStr);
        const monthEnd = new Date(endDateStr);
        
        let current = start < monthStart ? monthStart : start;
        const max = end > monthEnd ? monthEnd : end;

        while (current <= max) {
          const currentDateStr = current.toISOString().split('T')[0];
          
          // Kiểm tra xem ngày này đã có trong records chấm công chưa
          const exists = records.find(r => r.date === currentDateStr && r.employeeId === leave.employeeId);
          if (!exists) {
            leaveRecords.push({
              id: 'leave-' + leave.id + '-' + currentDateStr,
              date: currentDateStr,
              employeeId: leave.employeeId,
              status: 'Leave', // Trạng thái đặc biệt cho Nghỉ phép
              checkInTime: leave.startDate,
              checkOutTime: leave.endDate,
              notes: 'Nghỉ phép: ' + leave.reason,
              employee: leave.employee
            });
          }
          current.setDate(current.getDate() + 1);
        }
      }

      // Gộp hai danh sách và sắp xếp lại
      const allRecords = [...records.map(r => r.toJSON()), ...leaveRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

      res.status(200).json({ records: allRecords });
    } catch (error) {
      console.error('[Attendance] ❌ Employee History error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung cho Admin xem toan bo danh sach cham cong cua ca cong ty trong mot ngay cu the (Ho tro phan trang)
  static async getHistory(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date || getVietnamDate();
      const { getPagination } = require('../utils/pagination');
      const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);

      const queryOptions = {
        where: { date: targetDate },
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'fullName', 'code', 'department'],
        }],
        order: [['checkInTime', 'ASC']],
      };

      if (isPaginated) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
        const { count, rows } = await Attendance.findAndCountAll(queryOptions);
        return res.status(200).json({
          records: rows,
          data: rows,
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        });
      }

      const records = await Attendance.findAll(queryOptions);

      res.status(200).json({ records });
    } catch (error) {
      console.error('[Attendance] ❌ History error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung cho Chrome Extension kiem tra nhan vien da checkout chua truoc khi cho phep tat trinh duyet hoac logout
  // Giai thich code khong thuan: Neu da check-in ma chua check-out thi tra ve canLogout: false kem canh bao bat buoc checkout
  static async checkAttendanceStatus(req, res) {
    try {
      const userId = req.user.id;
      const today = getVietnamDate();

      const attendance = await Attendance.findOne({
        where: { employeeId: userId, date: today }
      });

      if (!attendance) {
        // Chưa chấm công vào → cho phép logout (vì chưa bắt đầu ca)
        return res.json({ canLogout: true, reason: 'Chưa check-in hôm nay' });
      }

      if (attendance.checkInTime && !attendance.checkOutTime) {
        // Đã check-in nhưng CHƯA check-out → KHÔNG cho logout
        return res.json({ canLogout: false, reason: 'Bạn phải chấm công ra (check-out) trước khi tắt Extension!' });
      }

      // Đã check-out → cho phép logout
      return res.json({ canLogout: true, reason: 'Đã check-out' });
    } catch (error) {
      console.error('[Attendance] ❌ Check status error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
  // Ham nay dung cho Admin/HR/Department Manager gui email yeu cau nhan vien giai trinh ve viec di muon hoac vang mat
  // Giai thich code khong thuan: Su dung Nodemailer gui mail bat dong bo (fire-and-forget) chua duong dan truc tiep den form giai trinh cua nhan vien
  static async requestExplanation(req, res) {
    try {
      const { id } = req.params;
      const attendance = await Attendance.findByPk(id, {
        include: [{ model: Employee, as: 'employee' }]
      });

      if (!attendance) {
        return res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công' });
      }

      // Kiểm tra phạm vi quyền: nếu là Trưởng phòng (department_manager), chỉ được yêu cầu cho nhân viên cùng phòng ban
      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.role ? [req.user.role] : []);
      const isDeptManager = !userRoles.includes('admin') && !userRoles.includes('hr_manager') && userRoles.includes('department_manager');
      if (isDeptManager && attendance.employee && attendance.employee.department !== req.user.department) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền yêu cầu giải trình cho nhân viên thuộc phòng ban của mình' });
      }

      // Đánh dấu đã yêu cầu giải trình
      attendance.explanationRequested = true;
      await attendance.save();

      // Gửi email
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const explanationLink = `${frontendUrl}/explanation/${attendance.id}`;

      const reason = attendance.status === 'Late' ? 'đi muộn' : 'vắng mặt';
      const dateStr = new Date(attendance.date).toLocaleDateString('vi-VN');

      // Gửi email bất đồng bộ (fire and forget) để không làm chậm response
      transporter.sendMail({
        from: '"HRMS Admin" <admin@hrms.com>',
        to: attendance.employee.email,
        subject: `Yêu cầu giải trình ${reason} ngày ${dateStr}`,
        html: `
          <h3>Yêu cầu giải trình</h3>
          <p>Xin chào ${attendance.employee.fullName},</p>
          <p>Hệ thống ghi nhận bạn đã ${reason} vào ngày ${dateStr}.</p>
          <p>Vui lòng click vào link dưới đây để gửi phản hồi giải trình cho Ban Giám đốc:</p>
          <a href="${explanationLink}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Viết giải trình</a>
          <p>Trân trọng,<br/>Phòng Nhân sự</p>
        `
      }).then(() => {
        console.log(`[Attendance] Email sent to ${attendance.employee.email}`);
      }).catch(mailError => {
        console.error('[Attendance] Mailer error (is SMTP configured?):', mailError.message);
      });

      res.json({ message: 'Đã gửi yêu cầu giải trình qua Email thành công', attendance });
    } catch (error) {
      console.error('[Attendance] ❌ Request explanation error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung de lay chi tiet mot ban ghi cham cong theo ID
  // Giai thich code khong thuan: Kiem tra quyen so huu ban ghi hoac vai tro Quan ly/Admin moi duoc xem
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const attendance = await Attendance.findByPk(id, {
        include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'code', 'department'] }]
      });

      if (!attendance) {
        return res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công' });
      }

      // Check permission: user must be owner or admin/manager
      const userRoles = req.user.roles || [req.user.role];
      const isManager = userRoles.includes('admin') || userRoles.includes('hr_manager') || userRoles.includes('department_manager');
      if (attendance.employeeId !== req.user.id && !isManager) {
        return res.status(403).json({ message: 'Bạn không có quyền xem bản ghi này' });
      }

      res.json(attendance);
    } catch (error) {
      console.error('[Attendance] ❌ Get by ID error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung de nhan vien nop form giai trinh ly do di muon hoac vang mat
  // Giai thich code khong thuan:
  // - Luu explanationText vao ban ghi Attendance
  // - Dong bo tao/cap nhat ban ghi trong bang AttendanceExplanation de he thong cron khong phat nham
  // - Phat su kien realtime Socket.io den phong 'admin_room' de cap quan ly biet ngay lap tuc
  static async submitExplanation(req, res) {
    try {
      const { id } = req.params;
      const { explanationText } = req.body;
      const userId = req.user.id;

      if (!explanationText || !explanationText.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập nội dung giải trình' });
      }

      const attendance = await Attendance.findByPk(id, {
        include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName'] }]
      });

      if (!attendance) {
        return res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công' });
      }

      if (attendance.employeeId !== userId) {
        return res.status(403).json({ message: 'Bạn không có quyền giải trình cho ngày này' });
      }

      attendance.explanationText = explanationText.trim();
      await attendance.save();

      // Đồng bộ vào bảng AttendanceExplanation để cron không phạt nhầm và quản lý duyệt được ở tab Leave
      const { AttendanceExplanation } = require('../models');
      const expType = attendance.status === 'Late' ? 'Late' : (attendance.status === 'Half-day' ? 'Leave_Early' : 'Missing_Punch');
      
      const userRole = (req.user?.role || '').toLowerCase();
      const initialStatus = userRole === 'department_manager' ? 'Pending_HR' : 'Pending';

      let expRecord = await AttendanceExplanation.findOne({
        where: { employeeId: userId, date: attendance.date }
      });

      if (expRecord) {
        await expRecord.update({
          reason: explanationText.trim(),
          status: initialStatus,
          type: expType
        });
      } else {
        expRecord = await AttendanceExplanation.create({
          employeeId: userId,
          date: attendance.date,
          type: expType,
          reason: explanationText.trim(),
          status: initialStatus
        });
      }

      // Phát sự kiện Socket cho Admin
      const io = req.app.get('io');
      if (io) {
        io.emit('explanation_submitted', attendance);
        io.to('admin_room').emit('new_explanation_request', {
          title: 'Giải trình chấm công mới',
          message: `Nhân viên ${attendance.employee?.fullName || 'nhân viên'} vừa nộp giải trình cho ngày ${attendance.date}.`,
          explanation: expRecord
        });
      }

      res.json({ message: 'Đã nộp giải trình thành công', attendance, explanation: expRecord });
    } catch (error) {
      console.error('[Attendance] ❌ Submit explanation error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
  // Ham nay dung de lay danh sach cac nhan vien co dau hieu vi pham cham cong trong thang (di tre >= 3 lan, vang >= 5 lan, quen checkout >= 3 lan)
  static async getWarnings(req, res) {
    try {
      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.role ? [req.user.role] : []);
      const canView = userRoles.includes('admin') || userRoles.includes('hr_manager') || userRoles.includes('department_manager');
      if (!canView) {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }

      const isDeptManager = !userRoles.includes('admin') && !userRoles.includes('hr_manager') && userRoles.includes('department_manager');

      const { Op } = require('sequelize');
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      const empWhere = (isDeptManager && req.user.department) ? { department: req.user.department } : undefined;

      // Lấy tất cả bản ghi trong tháng hiện tại
      const records = await Attendance.findAll({
        where: {
          date: { [Op.between]: [startDate, endDate] }
        },
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'fullName', 'code', 'department'],
          ...(empWhere ? { where: empWhere } : {})
        }]
      });

      const todayStr = getVietnamDate();

      // Nhóm theo nhân viên
      const statsMap = {};
      records.forEach(r => {
        if (!r.employee) return;
        if (!statsMap[r.employeeId]) {
          statsMap[r.employeeId] = {
            employee: r.employee,
            lateCount: 0,
            absentCount: 0,
            missingCheckoutCount: 0
          };
        }
        if (r.status === 'Late') statsMap[r.employeeId].lateCount++;
        if (r.status === 'Absent') statsMap[r.employeeId].absentCount++;
        if (r.checkInTime && !r.checkOutTime && r.date < todayStr) {
          statsMap[r.employeeId].missingCheckoutCount++;
        }
      });

      // Lọc những người vượt ngưỡng (thêm ngưỡng quên chấm công nếu cần, tạm thời filter theo late >= 3 hoặc absent >= 5 hoặc missingCheckout >= 3)
      const warnings = Object.values(statsMap).filter(s => s.lateCount >= 3 || s.absentCount >= 5 || s.missingCheckoutCount >= 3);

      res.status(200).json({ warnings });
    } catch (error) {
      console.error('[Attendance] ❌ Get warnings error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
  // Ham nay dung de Admin/HR/Department Manager chu dong gui tin nhan canh bao vi pham cham cong truc tiep toi nhan vien
  // Giai thich code khong thuan: Phat socket realtime 'hrms_attendance_warning' va gui tin nhan qua Telegram Bot truc tiep toi employeeId
  static async sendManualWarning(req, res) {
    try {
      const { employeeId } = req.params;
      const { Op } = require('sequelize');
      
      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.role ? [req.user.role] : []);
      const canSend = userRoles.includes('admin') || userRoles.includes('hr_manager') || userRoles.includes('department_manager');
      if (!canSend) {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }

      const isDeptManager = !userRoles.includes('admin') && !userRoles.includes('hr_manager') && userRoles.includes('department_manager');
      if (isDeptManager) {
        const targetEmp = await Employee.findByPk(employeeId, { attributes: ['id', 'department'] });
        if (!targetEmp || targetEmp.department !== req.user.department) {
          return res.status(403).json({ message: 'Bạn chỉ có quyền gửi cảnh báo cho nhân viên thuộc phòng ban của mình' });
        }
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      const todayStrLocal = now.toISOString().split('T')[0];

      const monthStats = await Attendance.findAll({
        where: {
          employeeId: employeeId,
          date: { [Op.between]: [startDate, endDate] }
        }
      });

      const lateCount = monthStats.filter(r => r.status === 'Late').length;
      const absentCount = monthStats.filter(r => r.status === 'Absent').length;
      const missingCheckoutCount = monthStats.filter(r => r.checkInTime && !r.checkOutTime && r.date < todayStrLocal).length;

      let warningReason = [];
      if (lateCount >= 3) warningReason.push(`Đi trễ ${lateCount} lần`);
      if (absentCount >= 5) warningReason.push(`Vắng mặt ${absentCount} lần`);
      if (missingCheckoutCount >= 3) warningReason.push(`Quên chấm công ra ${missingCheckoutCount} lần`);
      
      if (warningReason.length === 0) {
        return res.status(400).json({ message: 'Nhân viên này chưa đủ điều kiện để bị cảnh báo!' });
      }

      const warningMsg = `Bạn đã ${warningReason.join(' và ')} trong tháng này!`;
      
      // Gửi Realtime Socket
      const io = req.app.get('io');
      if (io) {
        io.to(employeeId.toString()).emit('hrms_attendance_warning', { 
          message: warningMsg, 
          lateCount, 
          absentCount,
          missingCheckoutCount
        });
      }

      // Gửi Telegram Bot
      const { telegramBot } = require('../services/telegramBot');
      if (telegramBot && typeof telegramBot.notifyUserAction === 'function') {
        telegramBot.notifyUserAction(employeeId, `🚨 <b>CẢNH BÁO VI PHẠM CHẤM CÔNG (QUẢN TRỊ VIÊN NHẮC NHỞ)</b>\n${warningMsg}\nVui lòng chú ý thời gian làm việc để không ảnh hưởng đến đánh giá thi đua!`);
      }

      res.status(200).json({ message: 'Đã gửi cảnh báo thành công!' });
    } catch (error) {
      console.error('[Attendance] ❌ Send manual warning error:', error);
      res.status(500).json({ message: 'Lỗi server khi gửi cảnh báo' });
    }
  }
}

module.exports = AttendanceController;
