const { Leave, AttendanceExplanation, Employee, Attendance } = require('../models');
const { Op } = require('sequelize');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');
const { calculateLeaveDays } = require('../utils/leaveUtils');

// Helper lấy thông tin phân quyền role của người dùng đang đăng nhập
function getUserRoleInfo(user) {
  const role = (user.role || '').toLowerCase().replace(/\s+/g, '_');
  const roles = (user.roles || []).map(r => 
    (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
  );
  const allRoles = [...new Set([role, ...roles])];
  const isAdmin = allRoles.includes('admin');
  const isHR = allRoles.includes('hr_manager');
  const isDeptManager = allRoles.includes('department_manager');
  return { 
    allRoles, 
    isAdmin, 
    isHR, 
    isDeptManager, 
    department: (user.department || '').trim() 
  };
}

// === LEAVE MANAGEMENT ===

// Ham nay dung de lay danh sach cac don xin nghi phep cua chinh nhan vien dang dang nhap (Ho tro phan trang)
exports.getMyLeaves = async (req, res) => {
  try {
    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const queryOptions = {
      where: { employeeId: req.user.id },
      include: [
        { model: Employee, as: 'managerApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'hrApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'approver', attributes: ['id', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      const { count, rows } = await Leave.findAndCountAll(queryOptions);
      return formatPaginatedResponse(res, count, rows, page, limit);
    }

    const leaves = await Leave.findAll(queryOptions);
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de nhan vien tao don xin nghi phep moi (Annual, Sick, Personal, Unpaid)
// CHUAN DOANH NGHIEP:
// - Validate thoi gian: startDate <= endDate, khong nop ngay qua khu qua xa
// - Check Overlapping: Chan nop don trung khoang thoi gian voi don dang cho duyet hoac da duyet
// - Kiem tra quy phep nam (12 ngay/nam theo Dieu 113 BLLD 2019) neu la phep nam (Annual)
// - Neu nguoi tao la Department Manager, tu dong chuyen thang len HR (Pending_HR)
exports.createLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc nghỉ phép' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Định dạng ngày tháng không hợp lệ' });
    }

    if (start > end) {
      return res.status(400).json({ message: 'Ngày bắt đầu không thể lớn hơn ngày kết thúc nghỉ phép' });
    }

    // 1. Kiểm tra chống trùng lặp thời gian nghỉ phép (Overlapping Check)
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const overlappingLeave = await Leave.findOne({
      where: {
        employeeId: req.user.id,
        status: { [Op.in]: ['Pending', 'Pending_HR', 'Pending_Admin', 'Approved'] },
        [Op.and]: [
          { startDate: { [Op.lte]: endStr } },
          { endDate: { [Op.gte]: startStr } }
        ]
      }
    });

    if (overlappingLeave) {
      const existStart = new Date(overlappingLeave.startDate).toLocaleDateString('vi-VN');
      const existEnd = new Date(overlappingLeave.endDate).toLocaleDateString('vi-VN');
      return res.status(400).json({ 
        message: `Bạn đã có một đơn nghỉ phép (${existStart} đến ${existEnd}) đang chờ duyệt hoặc đã được phê duyệt trong khoảng thời gian này!` 
      });
    }

    // 2. Kiểm tra quỹ phép năm nếu là loại 'Annual' (Mặc định 12 ngày/năm theo Điều 113 BLLĐ 2019)
    if (leaveType === 'Annual') {
      const currentYear = start.getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const existingAnnualLeaves = await Leave.findAll({
        where: {
          employeeId: req.user.id,
          leaveType: 'Annual',
          status: { [Op.in]: ['Approved', 'Pending', 'Pending_HR', 'Pending_Admin'] },
          startDate: { [Op.gte]: yearStart },
          endDate: { [Op.lte]: yearEnd }
        }
      });

      // Chuẩn BLLĐ 2019 (Điều 113): Quỹ phép năm chỉ trừ các ngày làm việc thực tế, loại trừ Thứ 7 và Chủ Nhật
      const totalDaysUsed = calculateLeaveDays(existingAnnualLeaves);
      const requestedDays = calculateLeaveDays([{ startDate: start, endDate: end }]);
      const ANNUAL_LEAVE_QUOTA = 12; // 12 ngày phép chuẩn theo luật

      if (totalDaysUsed + requestedDays > ANNUAL_LEAVE_QUOTA) {
        return res.status(400).json({ 
          message: `Số ngày phép năm xin nghỉ vượt quá quỹ phép năm quy định (${ANNUAL_LEAVE_QUOTA} ngày/năm). Bạn đã sử dụng/chờ duyệt ${totalDaysUsed} ngày. Vui lòng chọn loại 'Unpaid' (Nghỉ không lương) nếu muốn tiếp tục.` 
        });
      }
    }

    const roleInfo = getUserRoleInfo(req.user);

    // Neu la Department Manager thi bo qua cap TP, vao thang cap HR
    const initialStatus = (roleInfo.isDeptManager && !roleInfo.isAdmin && !roleInfo.isHR) 
      ? 'Pending_HR' 
      : 'Pending';
    
    // Tao don nghi phep
    const leave = await Leave.create({
      employeeId: req.user.id,
      leaveType: leaveType || 'Annual',
      startDate: startStr,
      endDate: endStr,
      reason: reason || 'Nghỉ giải quyết việc cá nhân',
      status: initialStatus
    });
    
    // Lay fullName cua nhan vien de thong bao ro rang hon
    const employee = await Employee.findByPk(req.user.id, { attributes: ['fullName', 'department'] });
    const displayName = employee?.fullName || req.user.username || 'Nhân viên';

    // Gui thong bao socket realtime den cac cap quan ly
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('new_leave_request', {
        title: 'Đơn xin nghỉ phép mới',
        message: `Nhân viên ${displayName} (${employee?.department || 'Chưa phân phòng'}) vừa gửi một đơn xin nghỉ phép.`,
        leave
      });
    }

    res.status(201).json({ 
      message: 'Tạo đơn nghỉ phép thành công, đang chờ cấp có thẩm quyền duyệt', 
      leave 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Cap quan ly theo Role lay danh sach don xin nghi phep can duyet
// Phân cấp lọc:
// - Admin: Xem toàn bộ các đơn đang chờ ở mọi cấp (Pending, Pending_HR, Pending_Admin)
// - HR Manager: Xem các đơn đã qua TP duyệt (Pending_HR) hoặc đơn do TP tự nộp
// - Department Manager: Chỉ xem đơn Pending của nhân viên thuộc phòng ban mình
exports.getAllPendingLeaves = async (req, res) => {
  try {
    const roleInfo = getUserRoleInfo(req.user);
    let whereCondition = {};
    let employeeWhere = { isDeleted: false };

    if (roleInfo.isAdmin) {
      // Admin thấy tất cả đơn đang chờ ở các cấp
      whereCondition = {
        status: { [Op.in]: ['Pending', 'Pending_HR', 'Pending_Admin'] }
      };
    } else if (roleInfo.isHR) {
      // HR thấy các đơn đã qua Trưởng phòng duyệt hoặc đơn TP tự gửi
      whereCondition = {
        status: { [Op.in]: ['Pending_HR', 'Pending'] }
      };
    } else if (roleInfo.isDeptManager) {
      // Trưởng phòng chỉ thấy đơn Pending của nhân viên cùng phòng ban (trừ đơn của chính mình)
      whereCondition = {
        status: 'Pending',
        employeeId: { [Op.ne]: req.user.id }
      };
      if (roleInfo.department) {
        employeeWhere.department = roleInfo.department;
      }
    } else {
      return res.status(403).json({ message: 'Bạn không có quyền duyệt đơn nghỉ phép' });
    }

    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const queryOptions = {
      where: whereCondition,
      include: [
        { 
          model: Employee, 
          as: 'employee', 
          attributes: ['id', 'fullName', 'code', 'department'],
          where: employeeWhere
        },
        { model: Employee, as: 'managerApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'hrApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'approver', attributes: ['id', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      const { count, rows } = await Leave.findAndCountAll(queryOptions);
      return formatPaginatedResponse(res, count, rows, page, limit);
    }

    const leaves = await Leave.findAll(queryOptions);

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de phe duyet don xin nghi phep theo tung cap role:
// - Cap 1 (department_manager): Duyet cap phong ban -> chuyen sang 'Pending_HR'
// - Cap 2 (hr_manager): Duyet cap nhan su -> chuyen sang 'Pending_Admin'
// - Cap 3 (admin): Duyet cap cao nhat -> 'Approved' va dong bo vao bang Attendance
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const roleInfo = getUserRoleInfo(req.user);

    const leave = await Leave.findByPk(id, {
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'department'] }]
    });

    if (!leave) return res.status(404).json({ message: 'Không tìm thấy đơn xin nghỉ' });

    if (leave.status === 'Approved') {
      return res.status(400).json({ message: 'Đơn xin nghỉ này đã được phê duyệt hoàn tất trước đó' });
    }
    if (leave.status === 'Rejected') {
      return res.status(400).json({ message: 'Đơn xin nghỉ này đã bị từ chối, không thể duyệt tiếp' });
    }

    const io = req.app.get('io');
    const startStr = new Date(leave.startDate).toLocaleDateString('vi-VN');
    const endStr = new Date(leave.endDate).toLocaleDateString('vi-VN');
    let messageResult = '';

    // === XỬ LÝ DUYỆT THEO CẤP ROLE ===

    if (roleInfo.isAdmin) {
      // 1. ADMIN: Phê duyệt cấp tối cao (Final Approval)
      await leave.update({ 
        status: 'Approved', 
        approvedBy: req.user.id 
      });

      // Đồng bộ sang bảng Attendance để lịch và báo cáo chấm công phản ánh chính xác
      try {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const cur = new Date(start);
        while (cur <= end) {
          const dayOfWeek = cur.getDay();
          // Chỉ tính từ thứ 2 đến thứ 6 (0 là CN, 6 là T7)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = cur.toISOString().split('T')[0];
            const existing = await Attendance.findOne({
              where: { employeeId: leave.employeeId, date: dateStr }
            });
            if (existing) {
              if (!existing.checkInTime) {
                await existing.update({
                  status: 'Present',
                  notes: `Nghỉ phép được duyệt (${leave.leaveType || 'Phép năm'})`
                });
              }
            } else {
              await Attendance.create({
                employeeId: leave.employeeId,
                date: dateStr,
                status: 'Present',
                notes: `Nghỉ phép được duyệt (${leave.leaveType || 'Phép năm'})`
              });
            }
          }
          cur.setDate(cur.getDate() + 1);
        }
      } catch (syncErr) {
        console.error('Lỗi khi đồng bộ nghỉ phép sang chấm công:', syncErr);
      }

      // Thông báo realtime cho nhân viên
      if (io) {
        io.to(leave.employeeId.toString()).emit('leave_status_updated', {
          title: 'Đơn xin nghỉ đã được Ban Giám Đốc phê duyệt',
          message: `Đơn xin nghỉ từ ${startStr} đến ${endStr} của bạn đã được Ban Giám Đốc phê duyệt hoàn tất.`,
          leave
        });
      }

      messageResult = 'Ban Giám Đốc đã phê duyệt hoàn tất đơn nghỉ phép';

    } else if (roleInfo.isHR) {
      // 2. HR MANAGER: Phê duyệt cấp 2 (Cấp Nhân Sự)
      // Chấp nhận đơn đã qua TP (Pending_HR) hoặc đơn Pending do TP gửi
      await leave.update({
        status: 'Pending_Admin',
        hrApprovedBy: req.user.id,
        hrApprovedAt: new Date()
      });

      if (io) {
        // Báo cho Admin biết đơn đã qua HR, chờ Admin chốt
        io.to('admin_room').emit('leave_status_updated', {
          title: 'Đơn nghỉ phép chờ Ban Giám Đốc duyệt',
          message: `Bộ phận Nhân sự đã duyệt đơn của ${leave.employee?.fullName}. Chờ Ban Giám Đốc phê duyệt cuối cùng.`,
          leave
        });
        // Báo cho nhân viên biết tiến độ
        io.to(leave.employeeId.toString()).emit('leave_status_updated', {
          title: 'Đơn nghỉ đã qua cấp Nhân sự',
          message: `Đơn xin nghỉ từ ${startStr} đến ${endStr} của bạn đã được Nhân sự duyệt, đang chờ Ban Giám Đốc phê duyệt.`,
          leave
        });
      }

      messageResult = 'Bộ phận Nhân sự đã duyệt thành công (Cấp 2), chuyển tiếp lên Ban Giám Đốc';

    } else if (roleInfo.isDeptManager) {
      // 3. DEPARTMENT MANAGER: Phê duyệt cấp 1 (Trưởng Phòng)
      if (leave.status !== 'Pending') {
        return res.status(400).json({ message: 'Đơn này đã được duyệt qua cấp Trưởng phòng' });
      }

      // Kiểm tra xem nhân viên có thuộc phòng ban của Trưởng phòng này không
      if (roleInfo.department && leave.employee?.department !== roleInfo.department) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền duyệt đơn của nhân viên thuộc phòng ban mình quản lý' });
      }

      if (leave.employeeId === req.user.id) {
        return res.status(400).json({ message: 'Trưởng phòng không thể tự duyệt đơn của chính mình' });
      }

      await leave.update({
        status: 'Pending_HR',
        managerApprovedBy: req.user.id,
        managerApprovedAt: new Date()
      });

      if (io) {
        // Báo cho HR / Admin biết TP đã thông qua
        io.to('admin_room').emit('leave_status_updated', {
          title: 'Đơn nghỉ phép chờ Nhân sự duyệt',
          message: `Trưởng phòng đã duyệt đơn của ${leave.employee?.fullName}. Đang chờ Bộ phận Nhân sự phê duyệt.`,
          leave
        });
        // Báo cho nhân viên
        io.to(leave.employeeId.toString()).emit('leave_status_updated', {
          title: 'Đơn nghỉ đã qua cấp Trưởng phòng',
          message: `Đơn xin nghỉ từ ${startStr} đến ${endStr} của bạn đã được Trưởng phòng thông qua, đang chuyển lên Nhân sự.`,
          leave
        });
      }

      messageResult = 'Trưởng phòng đã duyệt thành công (Cấp 1), chuyển tiếp lên Bộ phận Nhân sự';

    } else {
      return res.status(403).json({ message: 'Bạn không có quyền duyệt đơn xin nghỉ phép' });
    }

    res.json({ message: messageResult, leave });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Cap quan ly hoac Admin tu choi don xin nghi phep
// Bat ky cap nao tu choi thi don deu chuyen thanh 'Rejected'
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason: rejectionReason } = req.body;
    const roleInfo = getUserRoleInfo(req.user);

    const leave = await Leave.findByPk(id, {
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'department'] }]
    });

    if (!leave) return res.status(404).json({ message: 'Không tìm thấy đơn xin nghỉ' });

    // Kiem tra quyen tu choi
    if (roleInfo.isDeptManager && !roleInfo.isAdmin && !roleInfo.isHR) {
      if (roleInfo.department && leave.employee?.department !== roleInfo.department) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền từ chối đơn của nhân viên thuộc phòng mình' });
      }
      if (leave.status !== 'Pending') {
        return res.status(400).json({ message: 'Đơn này đã vượt quá cấp phê duyệt của Trưởng phòng' });
      }
    }

    const wasApproved = leave.status === 'Approved';
    await leave.update({ 
      status: 'Rejected', 
      approvedBy: req.user.id,
      rejectionReason: rejectionReason || 'Cấp quản lý từ chối đơn'
    });

    // Neu truoc do tung duyet Approved va gio tu choi, don dep ban ghi cham cong
    if (wasApproved) {
      try {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const cur = new Date(start);
        while (cur <= end) {
          const dateStr = cur.toISOString().split('T')[0];
          await Attendance.destroy({
            where: {
              employeeId: leave.employeeId,
              date: dateStr,
              checkInTime: null,
              notes: { [Op.like]: 'Nghỉ phép được duyệt%' }
            }
          });
          cur.setDate(cur.getDate() + 1);
        }
      } catch (cleanErr) {
        console.error('Lỗi khi hoàn tác chấm công nghỉ phép:', cleanErr);
      }
    }

    // Gui thong bao socket realtime den employee
    const io = req.app.get('io');
    if (io) {
      const startStr = new Date(leave.startDate).toLocaleDateString('vi-VN');
      const endStr = new Date(leave.endDate).toLocaleDateString('vi-VN');
      io.to(leave.employeeId.toString()).emit('leave_status_updated', {
        title: 'Đơn xin nghỉ bị từ chối',
        message: `Đơn xin nghỉ từ ${startStr} đến ${endStr} của bạn đã bị từ chối. ${rejectionReason ? `Lý do: ${rejectionReason}` : ''}`,
        leave
      });
    }

    res.json({ message: 'Đã từ chối đơn nghỉ phép', leave });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham cho phep nhan vien tu huy don xin nghi phep khi don van o trang thai Pending hoac Pending_HR
exports.cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findByPk(id);

    if (!leave) {
      return res.status(404).json({ message: 'Không tìm thấy đơn xin nghỉ phép' });
    }

    if (leave.employeeId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể hủy đơn xin nghỉ phép của chính mình' });
    }

    if (leave.status !== 'Pending' && leave.status !== 'Pending_HR') {
      return res.status(400).json({ 
        message: 'Chỉ có thể hủy đơn đang chờ phê duyệt. Đơn đã được duyệt hoàn tất hoặc đã bị từ chối không thể tự hủy.' 
      });
    }

    await leave.destroy();
    res.json({ message: 'Đã hủy đơn xin nghỉ phép thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// === ATTENDANCE EXPLANATION ===

// Ham nay dung de nhan vien xem danh sach cac don giai trinh cham cong cua chinh minh (Ho tro phan trang)
exports.getMyExplanations = async (req, res) => {
  try {
    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const queryOptions = {
      where: { employeeId: req.user.id },
      include: [
        { model: Employee, as: 'managerApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'hrApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'approver', attributes: ['id', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      const { count, rows } = await AttendanceExplanation.findAndCountAll(queryOptions);
      return formatPaginatedResponse(res, count, rows, page, limit);
    }

    const explanations = await AttendanceExplanation.findAll(queryOptions);
    res.json(explanations);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de nhan vien tao don giai trinh cham cong (di tre, quen checkout, ve som)
// Gioi han toi da 3 lan trong thang. Neu nguoi tao la TP thi tu dong bo qua cap TP sang HR.
exports.createExplanation = async (req, res) => {
  try {
    const { date, type, reason } = req.body;
    const roleInfo = getUserRoleInfo(req.user);
    
    if (date) {
      const monthStr = date.substring(0, 7);
      const explanationCount = await AttendanceExplanation.count({
        where: {
          employeeId: req.user.id,
          date: {
            [Op.startsWith]: monthStr
          }
        }
      });

      if (explanationCount >= 3) {
        return res.status(400).json({ message: 'Bạn đã vượt quá giới hạn 3 lần kiến nghị giải trình trong tháng này.' });
      }
    }
    
    const initialStatus = (roleInfo.isDeptManager && !roleInfo.isAdmin && !roleInfo.isHR)
      ? 'Pending_HR'
      : 'Pending';

    const explanation = await AttendanceExplanation.create({
      employeeId: req.user.id,
      date,
      type,
      reason,
      status: initialStatus
    });
    
    // Lay fullName cua nhan vien de thong bao ro rang hon
    const employee = await Employee.findByPk(req.user.id, { attributes: ['fullName', 'department'] });
    const displayName = employee?.fullName || req.user.username || 'Nhân viên';

    // Gui thong bao den admin_room qua socket
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('new_explanation_request', {
        title: 'Giải trình chấm công mới',
        message: `Nhân viên ${displayName} (${employee?.department || 'Chưa phân phòng'}) vừa gửi một đơn giải trình chấm công ngày ${date}.`,
        explanation
      });
    }

    res.status(201).json({ 
      message: 'Gửi giải trình thành công, đang chờ cấp có thẩm quyền duyệt', 
      explanation 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Cap quan ly theo Role lay danh sach cac don giai trinh dang cho duyet
// Phân cấp lọc:
// - Admin: Xem toàn bộ giải trình đang chờ (Pending, Pending_HR, Pending_Admin)
// - HR Manager: Xem giải trình đã qua TP (Pending_HR) hoặc giải trình do TP tự nộp
// - Department Manager: Chỉ xem giải trình Pending của nhân viên thuộc phòng mình
exports.getAllPendingExplanations = async (req, res) => {
  try {
    const roleInfo = getUserRoleInfo(req.user);
    let whereCondition = {};
    let employeeWhere = { isDeleted: false };

    if (roleInfo.isAdmin) {
      whereCondition = {
        status: { [Op.in]: ['Pending', 'Pending_HR', 'Pending_Admin'] }
      };
    } else if (roleInfo.isHR) {
      whereCondition = {
        status: { [Op.in]: ['Pending_HR', 'Pending'] }
      };
    } else if (roleInfo.isDeptManager) {
      whereCondition = {
        status: 'Pending',
        employeeId: { [Op.ne]: req.user.id }
      };
      if (roleInfo.department) {
        employeeWhere.department = roleInfo.department;
      }
    } else {
      return res.status(403).json({ message: 'Bạn không có quyền duyệt giải trình' });
    }

    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const queryOptions = {
      where: whereCondition,
      include: [
        { 
          model: Employee, 
          as: 'employee', 
          attributes: ['id', 'fullName', 'code', 'department'],
          where: employeeWhere
        },
        { model: Employee, as: 'managerApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'hrApprover', attributes: ['id', 'fullName'] },
        { model: Employee, as: 'approver', attributes: ['id', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      const { count, rows } = await AttendanceExplanation.findAndCountAll(queryOptions);
      return formatPaginatedResponse(res, count, rows, page, limit);
    }

    const explanations = await AttendanceExplanation.findAll(queryOptions);

    res.json(explanations);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de phe duyet don giai trinh cham cong theo tung cap role:
// - Cap 1 (department_manager): Duyet cap phong ban -> 'Pending_HR'
// - Cap 2 (hr_manager): Duyet cap nhan su -> 'Pending_Admin'
// - Cap 3 (admin): Duyet cap cao nhat -> 'Approved' va sua gio cham cong Attendance hop le
exports.approveExplanation = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime } = req.body;
    const roleInfo = getUserRoleInfo(req.user);

    const explanation = await AttendanceExplanation.findByPk(id, {
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'department'] }]
    });

    if (!explanation) return res.status(404).json({ message: 'Không tìm thấy giải trình' });

    if (explanation.status === 'Approved') {
      return res.status(400).json({ message: 'Đơn giải trình này đã được phê duyệt hoàn tất trước đó' });
    }
    if (explanation.status === 'Rejected') {
      return res.status(400).json({ message: 'Đơn giải trình này đã bị từ chối' });
    }

    const io = req.app.get('io');
    let messageResult = '';

    if (roleInfo.isAdmin) {
      // 1. ADMIN: Phê duyệt hoàn tất cấp cao nhất
      await explanation.update({ 
        status: 'Approved', 
        approvedBy: req.user.id 
      });
      
      // Cập nhật bản ghi chấm công Attendance
      const attendance = await Attendance.findOne({ 
        where: { employeeId: explanation.employeeId, date: explanation.date } 
      });
      
      if (attendance) {
        const updateData = {};
        if (explanation.type === 'Late' || explanation.type === 'Leave_Early' || explanation.type === 'Missing_Punch') {
          updateData.status = 'Present';
        }
        if (checkInTime) updateData.checkInTime = checkInTime;
        if (checkOutTime) updateData.checkOutTime = checkOutTime;

        if (Object.keys(updateData).length > 0) {
          await attendance.update(updateData);
        }
      } else {
        if (checkInTime || checkOutTime) {
          await Attendance.create({
            employeeId: explanation.employeeId,
            date: explanation.date,
            status: 'Present',
            checkInTime: checkInTime || null,
            checkOutTime: checkOutTime || null
          });
        }
      }
      
      if (io) {
        io.to(explanation.employeeId.toString()).emit('explanation_status_updated', {
          title: 'Đơn giải trình đã được Ban Giám Đốc phê duyệt',
          message: `Đơn giải trình ngày ${explanation.date} của bạn đã được Ban Giám Đốc phê duyệt hoàn tất.`,
          explanation
        });
      }

      messageResult = 'Ban Giám Đốc đã phê duyệt hoàn tất đơn giải trình';

    } else if (roleInfo.isHR) {
      // 2. HR MANAGER: Phê duyệt cấp 2 (Nhân sự)
      await explanation.update({
        status: 'Pending_Admin',
        hrApprovedBy: req.user.id,
        hrApprovedAt: new Date()
      });

      if (io) {
        io.to('admin_room').emit('explanation_status_updated', {
          title: 'Giải trình chờ Ban Giám Đốc duyệt',
          message: `Bộ phận Nhân sự đã duyệt giải trình ngày ${explanation.date} của ${explanation.employee?.fullName}. Chờ Ban Giám Đốc phê duyệt cuối.`,
          explanation
        });
        io.to(explanation.employeeId.toString()).emit('explanation_status_updated', {
          title: 'Giải trình đã qua cấp Nhân sự',
          message: `Đơn giải trình ngày ${explanation.date} của bạn đã được Nhân sự duyệt, đang chờ Ban Giám Đốc duyệt.`,
          explanation
        });
      }

      messageResult = 'Bộ phận Nhân sự đã duyệt thành công (Cấp 2), chuyển tiếp lên Ban Giám Đốc';

    } else if (roleInfo.isDeptManager) {
      // 3. DEPARTMENT MANAGER: Phê duyệt cấp 1 (Trưởng phòng)
      if (explanation.status !== 'Pending') {
        return res.status(400).json({ message: 'Đơn giải trình này đã được duyệt qua cấp Trưởng phòng' });
      }

      if (roleInfo.department && explanation.employee?.department !== roleInfo.department) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền duyệt giải trình của nhân viên cùng phòng ban' });
      }

      if (explanation.employeeId === req.user.id) {
        return res.status(400).json({ message: 'Trưởng phòng không thể tự duyệt giải trình của chính mình' });
      }

      await explanation.update({
        status: 'Pending_HR',
        managerApprovedBy: req.user.id,
        managerApprovedAt: new Date()
      });

      if (io) {
        io.to('admin_room').emit('explanation_status_updated', {
          title: 'Giải trình chờ Nhân sự duyệt',
          message: `Trưởng phòng đã duyệt giải trình ngày ${explanation.date} của ${explanation.employee?.fullName}. Đang chờ Nhân sự duyệt.`,
          explanation
        });
        io.to(explanation.employeeId.toString()).emit('explanation_status_updated', {
          title: 'Giải trình đã qua cấp Trưởng phòng',
          message: `Đơn giải trình ngày ${explanation.date} của bạn đã được Trưởng phòng duyệt, đang chuyển tiếp lên Nhân sự.`,
          explanation
        });
      }

      messageResult = 'Trưởng phòng đã duyệt thành công (Cấp 1), chuyển tiếp lên Bộ phận Nhân sự';

    } else {
      return res.status(403).json({ message: 'Bạn không có quyền duyệt đơn giải trình' });
    }

    res.json({ message: messageResult, explanation });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de tu choi don giai trinh cham cong
exports.rejectExplanation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason: rejectionReason } = req.body;
    const roleInfo = getUserRoleInfo(req.user);

    const explanation = await AttendanceExplanation.findByPk(id, {
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'department'] }]
    });

    if (!explanation) return res.status(404).json({ message: 'Không tìm thấy giải trình' });

    if (roleInfo.isDeptManager && !roleInfo.isAdmin && !roleInfo.isHR) {
      if (roleInfo.department && explanation.employee?.department !== roleInfo.department) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền từ chối giải trình của nhân viên cùng phòng ban' });
      }
      if (explanation.status !== 'Pending') {
        return res.status(400).json({ message: 'Giải trình này đã vượt quá cấp phê duyệt của Trưởng phòng' });
      }
    }

    await explanation.update({ 
      status: 'Rejected', 
      approvedBy: req.user.id,
      rejectionReason: rejectionReason || 'Cấp quản lý từ chối giải trình'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(explanation.employeeId.toString()).emit('explanation_status_updated', {
        title: 'Đơn giải trình bị từ chối',
        message: `Đơn giải trình ngày ${explanation.date} của bạn đã bị từ chối. ${rejectionReason ? `Lý do: ${rejectionReason}` : ''}`,
        explanation
      });
    }

    res.json({ message: 'Đã từ chối giải trình', explanation });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
