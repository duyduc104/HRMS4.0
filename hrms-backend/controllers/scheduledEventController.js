// Controller quan ly lich trinh su kien, gui email tu dong va dat lich hop Google Meet
// Giai thich code khong thuan:
// - Tich hop Google Calendar API v3 de tu dong sinh phong hop Google Meet (hangoutsMeet).
// - Smart Event: Tu dong quet lich su cham cong cua nguoi tham gia, neu di muon >= 3 lan trong thang thi tao email canh bao di muon kem link nop giai trinh.
// - Phong ngua Race Condition voi Cron Job bang cach chi cho sua khi status = PENDING.
// - Realtime Socket.io thong bao truc tiep vao room cua tung userId.

const { Op } = require('sequelize');
const { Employee, ScheduledEvent, Attendance } = require('../models');

// Ham nay dung de quet du lieu cham cong cua danh sach email nguoi tham gia, canh bao neu di muon >= 3 lan trong thang
async function checkAttendeeLateStatus(emailsStr) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const emailList = emailsStr.split(',').map(e => e.trim()).filter(Boolean);
  const employees = await Employee.findAll({
    where: { email: { [Op.in]: emailList }, isDeleted: false },
    attributes: ['id', 'fullName', 'email']
  });
  
  const warnings = [];
  for (const emp of employees) {
    const lateCount = await Attendance.count({
      where: {
        employeeId: emp.id,
        status: 'Late',
        date: { [Op.between]: [startOfMonth, endOfMonth] }
      }
    });
    
    if (lateCount >= 3) {
      warnings.push({ employeeId: emp.id, employeeName: emp.fullName, email: emp.email, lateCount, month });
    }
  }
  return warnings;
}

// Ham nay dung de lay danh sach cac su kien lich hop hoac email da len lich theo khoang thoi gian va quyen han nguoi dung
exports.getEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    let whereClause = {
      title: {
        [Op.notLike]: '[[]Invite] %'
      }
    };
    if (start && end) {
      whereClause.scheduledAt = {
        [Op.between]: [new Date(start), new Date(end)]
      };
    }
    
    // Nếu không phải là admin hoặc hr_manager thì lấy event do mình tạo hoặc được mời (email nằm trong payload)
    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    const isAdminOrHR = userRoles.includes('admin') || userRoles.includes('hr_manager') || req.user.role === 'admin' || req.user.role === 'hr_manager';
    if (!isAdminOrHR) {
      const emp = await Employee.findByPk(req.user.id, { attributes: ['email'] });
      const userEmail = emp ? emp.email : null;

      const userConditions = [ { creatorId: req.user.id } ];
      if (userEmail) {
        userConditions.push({ payload: { [Op.like]: `%${userEmail}%` } });
      }

      whereClause = {
        [Op.and]: [
          whereClause,
          { [Op.or]: userConditions }
        ]
      };
    }

    const events = await ScheduledEvent.findAll({
      where: whereClause,
      include: [{ model: Employee, as: 'creator', attributes: ['id', 'fullName', 'username'] }],
      order: [['scheduledAt', 'ASC']]
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de len lich hen gio gui email tu dong toi nhan vien, phong ban hoac toan the cong ty
exports.scheduleEmail = async (req, res) => {
  try {
    const { title, scheduledAt, to, subject, body, attachments } = req.body;

    if (!title || !scheduledAt || !to || !subject || !body) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đủ thông tin: title, scheduledAt, to, subject, body' });
    }

    let toArray = Array.isArray(to) ? to : to.split(',').map(s => s.trim());
    let finalEmails = new Set();

    for (const target of toArray) {
      if (target === 'ALL') {
        const allEmps = await Employee.findAll({ where: { isDeleted: false }, attributes: ['email'] });
        allEmps.forEach(e => { if (e.email) finalEmails.add(e.email); });
      } else if (target.startsWith('DEPT:')) {
        const deptName = target.substring(5);
        const deptEmps = await Employee.findAll({ 
          where: { department: deptName, isDeleted: false },
          attributes: ['email']
        });
        deptEmps.forEach(e => { if (e.email) finalEmails.add(e.email); });
      } else if (target) {
        finalEmails.add(target);
      }
    }

    const finalRecipients = Array.from(finalEmails).join(', ');

    if (!finalRecipients) {
      return res.status(400).json({ message: 'Không tìm thấy email người nhận hợp lệ' });
    }

    const event = await ScheduledEvent.create({
      creatorId: req.user.id,
      title,
      type: 'EMAIL',
      scheduledAt: new Date(scheduledAt),
      status: 'PENDING',
      payload: { to: finalRecipients, subject, body, attachments: attachments || [] }
    });

    try {
      const lateWarnings = await checkAttendeeLateStatus(finalRecipients);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      for (const w of lateWarnings) {
        await ScheduledEvent.create({
          creatorId: req.user.id,
          title: `[AI Nhắc nhở] Tình trạng đi muộn - ${w.employeeName}`,
          type: 'EMAIL',
          scheduledAt: new Date(), // Gui ngay lap tuc
          status: 'PENDING',
          payload: {
            to: w.email,
            subject: `⏰ Nhắc nhở: Bạn đã đi muộn ${w.lateCount} lần trong tháng ${w.month}`,
            body: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">⏰ Nhắc nhở chấm công</h2>
              <p>Xin chào <b>${w.employeeName}</b>,</p>
              <p>Hệ thống ghi nhận bạn đã đi muộn <b style="color: #ef4444;">${w.lateCount} lần</b> trong tháng ${w.month}.</p>
              <p>Vui lòng:</p>
              <ul>
                <li>Chú ý giờ giấc làm việc (trước 8:30 sáng)</li>
                <li>Nộp đơn giải trình nếu chưa: <a href="${frontendUrl}/leave?tab=my-explanation">Viết giải trình</a></li>
              </ul>
              <p style="color: #71717a; font-size: 13px;">Email này được gửi tự động bởi AI HRMS khi phát hiện bạn được mời vào một sự kiện.</p>
            </div>`
          }
        });
      }
      
      if (lateWarnings.length > 0) {
        console.log(`[Smart Event] AI đã tạo ${lateWarnings.length} email nhắc nhở đi muộn`);
      }
    } catch (lateErr) {
      console.error('[Smart Event] Lỗi khi quét dữ liệu đi muộn:', lateErr);
    }

    res.status(201).json({ message: 'Đã lên lịch gửi email thành công', event });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de cap nhat thong tin su kien da len lich (khoa chan neu su kien dang duoc xu ly hoac da xong)
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, scheduledAt, to, subject, body } = req.body;
    let { meetLink } = req.body;
    
    const event = await ScheduledEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện' });
    }

    if (req.user.role !== 'admin' && event.creatorId !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền sửa sự kiện này' });
    }

    // Xu ly race condition: chi cho phep sua neu status van la PENDING
    const [updatedCount] = await ScheduledEvent.update({
      title,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : event.scheduledAt,
      meetLink: meetLink || event.meetLink,
      payload: { ...event.payload, to: to || event.payload?.to, subject: subject || event.payload?.subject, body: body || event.payload?.body }
    }, {
      where: {
        id: event.id,
        status: 'PENDING'
      }
    });

    if (updatedCount === 0) {
      return res.status(400).json({ message: 'Sự kiện đang được hệ thống xử lý gửi hoặc đã hoàn thành, không thể chỉnh sửa lúc này!' });
    }

    res.json({ message: 'Đã cập nhật sự kiện thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de xoa bo su kien da len lich theo id
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await ScheduledEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện' });
    }

    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    const isAdmin = userRoles.includes('admin') || req.user.role === 'admin';
    if (!isAdmin && event.creatorId !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa sự kiện này' });
    }

    await event.destroy();
    res.json({ message: 'Đã xóa sự kiện thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de tao lich hop, tu dong tao phong Google Meet qua Google Calendar API va ban thong bao Realtime Socket
exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, scheduledAt, endAt, to, subject, body } = req.body;
    let { meetLink } = req.body;

    if (!title || !scheduledAt || !to) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đủ thông tin: title, scheduledAt, to' });
    }

    let toArray = Array.isArray(to) ? to : to.split(',').map(s => s.trim());
    let finalEmails = new Set();
    let finalUserIds = new Set();

    for (const target of toArray) {
      if (target === 'ALL') {
        const allEmps = await Employee.findAll({ where: { isDeleted: false }, attributes: ['id', 'email'] });
        allEmps.forEach(e => { if (e.email) finalEmails.add(e.email); finalUserIds.add(e.id); });
      } else if (target.startsWith('DEPT:')) {
        const deptName = target.substring(5);
        const deptEmps = await Employee.findAll({ 
          where: { department: deptName, isDeleted: false },
          attributes: ['id', 'email']
        });
        deptEmps.forEach(e => { if (e.email) finalEmails.add(e.email); finalUserIds.add(e.id); });
      } else if (target) {
        const emp = await Employee.findOne({ where: { email: target, isDeleted: false }, attributes: ['id', 'email'] });
        if (emp) {
          finalEmails.add(emp.email);
          finalUserIds.add(emp.id);
        } else {
          finalEmails.add(target);
        }
      }
    }

    const finalRecipients = Array.from(finalEmails);
    const userIds = Array.from(finalUserIds);

    if (finalRecipients.length === 0) {
      return res.status(400).json({ message: 'Không tìm thấy người nhận hợp lệ' });
    }

    if (!meetLink) {
      const googleCalendarController = require('./googleCalendarController');
      const { google } = require('googleapis');
      const authClient = await googleCalendarController.getAuthenticatedClient(req.user.id);
      
      if (!authClient) {
        return res.status(400).json({ message: 'GOOGLE_AUTH_REQUIRED', error: 'Vui lòng liên kết tài khoản Google Calendar trước khi tạo lịch họp.' });
      }

      const calendar = google.calendar({ version: 'v3', auth: authClient });
      const eventDetails = {
        summary: title,
        description: body,
        start: { dateTime: new Date(scheduledAt).toISOString() },
        end: { dateTime: endAt ? new Date(endAt).toISOString() : new Date(new Date(scheduledAt).getTime() + 60*60*1000).toISOString() },
        attendees: finalRecipients.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: require('crypto').randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };

      try {
        const resGcal = await calendar.events.insert({
          calendarId: 'primary',
          resource: eventDetails,
          conferenceDataVersion: 1
        });
        meetLink = resGcal.data.hangoutLink;
      } catch (err) {
        console.error('Google Calendar API Error:', err);
        if (err.message && err.message.includes('invalid_grant')) {
           return res.status(400).json({ message: 'GOOGLE_AUTH_REQUIRED', error: 'Tài khoản Google Calendar đã hết hạn hoặc bị thu hồi quyền. Vui lòng liên kết lại trong cài đặt.' });
        }
        return res.status(500).json({ message: 'Lỗi khi tạo Google Meet: ' + err.message });
      }
    }

    const meetingEvent = await ScheduledEvent.create({
      creatorId: req.user.id,
      title,
      type: 'MEETING',
      scheduledAt: new Date(scheduledAt),
      endAt: endAt ? new Date(endAt) : null,
      meetLink,
      status: 'PENDING',
      payload: { to: finalRecipients.join(', ') }
    });

    try {
      const lateWarnings = await checkAttendeeLateStatus(finalRecipients.join(', '));
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      for (const w of lateWarnings) {
        await ScheduledEvent.create({
          creatorId: req.user.id,
          title: `[AI Nhắc nhở] Tình trạng đi muộn - ${w.employeeName}`,
          type: 'EMAIL',
          scheduledAt: new Date(), // Gửi ngay lập tức
          status: 'PENDING',
          payload: {
            to: w.email,
            subject: `⏰ Nhắc nhở: Bạn đã đi muộn ${w.lateCount} lần trong tháng ${w.month}`,
            body: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">⏰ Nhắc nhở chấm công</h2>
              <p>Xin chào <b>${w.employeeName}</b>,</p>
              <p>Hệ thống ghi nhận bạn đã đi muộn <b style="color: #ef4444;">${w.lateCount} lần</b> trong tháng ${w.month}.</p>
              <p>Vui lòng:</p>
              <ul>
                <li>Chú ý giờ giấc làm việc (trước 8:30 sáng)</li>
                <li>Nộp đơn giải trình nếu chưa: <a href="${frontendUrl}/leave?tab=my-explanation">Viết giải trình</a></li>
              </ul>
              <p style="color: #71717a; font-size: 13px;">Email này được gửi tự động bởi AI HRMS khi phát hiện bạn được mời vào một sự kiện.</p>
            </div>`
          }
        });
      }
      
      if (lateWarnings.length > 0) {
        console.log(`[Smart Event] AI đã tạo ${lateWarnings.length} email nhắc nhở đi muộn`);
      }
    } catch (lateErr) {
      console.error('[Smart Event] Lỗi khi quét dữ liệu đi muộn:', lateErr);
    }

    // (Đã xóa đoạn tự sinh email [Invite] vì Google Calendar API đã tự động gửi email thông báo cho người tham dự)

    // Gửi realtime notification
    const io = req.app.get('io');
    if (io) {
      userIds.forEach(uid => {
        io.to(uid.toString()).emit('new_notification', {
          title: 'Mời họp: ' + title,
          message: `Lịch họp lúc ${new Date(scheduledAt).toLocaleString('vi-VN')}`,
          type: 'MEETING',
          link: meetLink || '/events'
        });
      });
    }

    res.status(201).json({ message: 'Đã tạo lịch họp và gửi thông báo thành công', event: meetingEvent });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};





