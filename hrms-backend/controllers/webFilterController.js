const { WebFilterRule, WebAccessLog, Employee, ExtensionHeartbeat, EmployeeExtensionRequirement, Setting, SecurityViolation } = require('../models');
const { Op } = require('sequelize');
const redisClient = require('../config/redisClient');
const aiQueue = require('../services/aiQueueService');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');
const { getVietnamDate } = require('../utils/dateUtils');

// === RULES MANAGEMENT ===

// Ham nay dung de lay danh sach cac luat loc web (Whitelist/Blacklist) kem danh sach nhan vien duoc mien tru
exports.getRules = async (req, res) => {
  try {
    const rules = await WebFilterRule.findAll({
      include: [{ model: Employee, as: 'exemptedEmployees', attributes: ['id', 'fullName'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin tao moi mot luat loc web (urlPattern, loai blacklist/whitelist, danh sach ngoai le)
exports.createRule = async (req, res) => {
  try {
    const { urlPattern, type, description, exemptedEmployeeIds } = req.body;
    const rule = await WebFilterRule.create({ urlPattern, type, description });
    
    if (exemptedEmployeeIds && exemptedEmployeeIds.length > 0) {
      await rule.addExemptedEmployees(exemptedEmployeeIds);
    }
    
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin cap nhat luat loc web va danh sach nhan vien duoc mien tru
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { urlPattern, type, isActive, description, exemptedEmployeeIds } = req.body;
    const rule = await WebFilterRule.findByPk(id);
    if (!rule) return res.status(404).json({ message: 'Không tìm thấy rule' });
    
    await rule.update({ urlPattern, type, isActive, description });
    
    if (exemptedEmployeeIds) {
      await rule.setExemptedEmployees(exemptedEmployeeIds);
    }
    
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin xoa mot luat loc web khoi he thong
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await WebFilterRule.findByPk(id);
    if (!rule) return res.status(404).json({ message: 'Không tìm thấy rule' });
    
    await rule.destroy();
    res.json({ message: 'Xóa rule thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// === LOGS MANAGEMENT ===

// Ham nay dung de lay danh sach nhat ky truy cap web cua toan bo nhan vien kem thong ke bi chan va cho phep
exports.getLogs = async (req, res) => {
  try {
    const logs = await WebAccessLog.findAll({
      include: [{ 
        model: Employee, 
        as: 'employee',
        attributes: ['id', 'fullName', 'email'],
        // required: false để LEFT JOIN — tránh mất log khi nhân viên đã bị xoá
        required: false,
      }],
      order: [['timestamp', 'DESC']],
      limit: 1000,
    });

    const stats = {
      totalBlocked: logs.filter(l => l.action === 'blocked').length,
      totalAllowed: logs.filter(l => l.action === 'allowed').length,
    };

    res.json({ stats, logs });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de tien ich Chrome Extension gui nhat ky truy cap web cua nhan vien ve may chu
// Giai thich code khong thuan:
// - Su dung Redis INCR tang bo dem truy cap web cam theo ngay (atomic counter ~0.1ms)
// - So sanh voi nguong BLOCKED_URL_THRESHOLD tu Redis cache
// - Neu vuot nguong lan 1: Phat canh bao qua Socket va day task vao Bull Queue (aiQueue) de AI phan tich hanh vi bat thuong
// - Neu da canh bao ma van co tinh truy cap: Tu dong khoa tai khoan (lockedKey), tao ban ghi SecurityViolation va force logout nhan vien ngay lap tuc
exports.addLog = async (req, res) => {
  try {
    const { url, action, device, os, browser } = req.body;
    // Ưu tiên dùng employeeId từ JWT (req.user) để đảm bảo đúng user đã xác thực
    // Fallback về req.body.employeeId nếu extension gửi kèm (tương thích ngược)
    const employeeId = req.user?.id || req.body.employeeId;
    
    // Check log settings
    if (action === 'allowed') {
      const setting = await Setting.findByPk('LOG_ALL_URLS');
      const logAllUrls = setting ? setting.value === 'true' : true;
      if (!logAllUrls) {
        return res.status(200).json({ message: 'Ignored allowed URL' });
      }
    }
    
    // Tự lấy IP từ request header
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress || 'Unknown';
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') ipAddress = '127.0.0.1 (Localhost)';
    
    const log = await WebAccessLog.create({
      employeeId,
      url,
      action,
      ipAddress,
      device,
      os,
      browser
    });

    const employee = await Employee.findByPk(employeeId, {
      attributes: ['id', 'fullName', 'email']
    });

    const logDataForSocket = {
      ...log.toJSON(),
      Employee: employee ? employee.toJSON() : null
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('new_access_log', logDataForSocket);
    }
    
    // === AI ANOMALY DETECTION (Redis-Optimized) ===
    if (action === 'blocked' && io) {
      const today = getVietnamDate();
      
      // 1. Redis INCR — atomic counter, ~0.1ms, tự động tạo key nếu chưa có
      const redisKey = `blocked:${employeeId}:${today}`;
      const blockedCount = await redisClient.incr(redisKey);
      
      // Đặt TTL 24h nếu là lần đầu (key vừa mới tạo)
      if (blockedCount === 1) {
        await redisClient.expire(redisKey, 86400); // 24 giờ
      }
      
      // 2. Lấy ngưỡng cảnh báo (cache trong Redis, fallback SQL)
      let threshold = 5;
      const cachedThreshold = await redisClient.get('setting:BLOCKED_URL_THRESHOLD');
      if (cachedThreshold) {
        threshold = parseInt(cachedThreshold);
      } else {
        const setting = await Setting.findByPk('BLOCKED_URL_THRESHOLD');
        if (setting) {
          threshold = parseInt(setting.value);
          await redisClient.set('setting:BLOCKED_URL_THRESHOLD', setting.value, { EX: 3600 });
        }
      }
      
      // 3. Kiểm tra trạng thái warned/locked (Redis EXISTS, ~0.05ms)
      const warnedKey = `warned:${employeeId}:${today}`;
      const lockedKey = `locked:${employeeId}:${today}`;
      const isWarned = await redisClient.exists(warnedKey);
      const isLocked = await redisClient.exists(lockedKey);
      
      if (isLocked) {
        // ĐÃ BỊ KHÓA → force-logout lại (phòng trường hợp NV login lại bằng cách khác)
        io.to(employeeId).emit('admin_force_logout');
      } else if (isWarned) {
        // ĐÃ CẢNH BÁO + VẪN VÀO URL CẤM → AUTO-LOGOUT
        await redisClient.set(lockedKey, '1', { EX: 86400 });
        
        // Tạo bản ghi SecurityViolation
        const blockedLogs = await WebAccessLog.findAll({
          where: {
            employeeId,
            action: 'blocked',
            timestamp: { [Op.gte]: new Date(today + 'T00:00:00') }
          },
          attributes: ['url'],
          raw: true
        });
        const urls = [...new Set(blockedLogs.map(l => l.url))].join(', ');

        await SecurityViolation.create({
          employeeId,
          date: today,
          blockedCount,
          blockedUrls: urls,
          status: 'Pending'
        });
        
        // Force-logout nhân viên (cả web + extension)
        io.to(employeeId).emit('admin_force_logout');
        
        // Thông báo Admin
        io.to('admin_room').emit('security_alert_auto_logout', {
          employee: employee ? employee.toJSON() : null,
          blockedCount,
          url,
          timestamp: new Date()
        });
        
        console.log(`[Security] 🔒 Auto-logout ${employee?.fullName} — ${blockedCount} blocked URLs`);
        
      } else if (blockedCount >= threshold) {
        // VƯỢT NGƯỠNG LẦN ĐẦU → CẢNH BÁO
        await redisClient.set(warnedKey, '1', { EX: 86400 });
        
        // Cảnh báo nhân viên
        io.to(employeeId).emit('security_warning', {
          title: '⚠️ CẢNH BÁO TRUY CẬP BẤT THƯỜNG',
          message: `Bạn đã truy cập ${blockedCount} URL bị cấm hôm nay. LẦN TIẾP THEO sẽ bị TỰ ĐỘNG ĐĂNG XUẤT!`,
          timestamp: new Date()
        });
        
        // Đẩy AI phân tích vào Bull Queue (async, không block response)
        aiQueue.add({
          source: 'anomaly_detection',
          employeeId,
          employeeName: employee?.fullName,
          date: today,
          blockedCount
        }, { 
          priority: 1,        // Ưu tiên cao
          removeOnComplete: true 
        });
        
        // Thông báo Admin ngay (không chờ AI)
        io.to('admin_room').emit('security_anomaly_alert', {
          employee: employee ? employee.toJSON() : null,
          blockedCount,
          url,
          timestamp: new Date()
        });
        
        console.log(`[Security] ⚠️ Anomaly alert: ${employee?.fullName} — ${blockedCount} blocked URLs`);
      }
    }

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin chu dong gui tin nhan canh bao bao mat truc tiep den man hinh nhan vien qua Socket.io
// Admin bấm cảnh báo nhân viên vi phạm
exports.sendWarning = async (req, res) => {
  try {
    const { employeeId, message } = req.body;
    
    // Lưu cảnh báo vào bảng Notification (nếu có bảng này trong DB, nhưng hiện tại ta có thể bắn trực tiếp qua socket)
    const io = req.app.get('io');
    if (io) {
      io.to(employeeId).emit('security_warning', {
        title: 'CẢNH BÁO BẢO MẬT',
        message: message || 'Bạn đã vi phạm quy định bảo mật của công ty (Mở Ẩn danh hoặc vào trang bị cấm). Vui lòng tuân thủ quy định!',
        timestamp: new Date()
      });
    }
    
    res.json({ message: 'Đã gửi cảnh báo thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// === EXTENSION HEARTBEAT ===

// Ham nay dung cho Chrome Extension gui tin hieu nhip tim dinh ky (2 phut/lan) de may chu xac nhan tien ich dang chay
// Extension gửi ping mỗi 2 phút để xác nhận còn hoạt động
exports.heartbeat = async (req, res) => {
  try {
    const employeeId = req.user.id; // Lấy từ JWT token
    const { browser, os, extensionVersion } = req.body;

    const lastPing = new Date();
    await ExtensionHeartbeat.upsert({
      employeeId,
      lastPing,
      browser: browser || null,
      os: os || null,
      extensionVersion: extensionVersion || '1.0.0',
      status: 'active'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('extension_status_update', { 
        employeeId, 
        status: 'active', 
        lastPing,
        browser: browser || null,
        os: os || null,
        extensionVersion: extensionVersion || '1.0.0'
      });
    }

    res.json({ message: 'Heartbeat received' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin theo doi tinh trang hoat dong Extension cua toan bo nhan vien (active, offline, not_installed)
// Admin xem trạng thái extension của toàn bộ nhân viên
exports.getExtensionStatus = async (req, res) => {
  try {
    // Lấy tất cả nhân viên kèm heartbeat
    const employees = await Employee.findAll({
      where: { isDeleted: false },
      attributes: ['id', 'fullName', 'email', 'username'],
      include: [
        {
          model: ExtensionHeartbeat,
          required: false // LEFT JOIN
        },
        {
          model: EmployeeExtensionRequirement,
          as: 'extensionRequirement',
          required: false
        }
      ]
    });

    const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 phút
    const now = new Date();

    const result = employees.map(emp => {
      const hb = emp.ExtensionHeartbeat;
      let extensionStatus = 'not_installed'; // Chưa từng cài
      let lastPing = null;

      if (hb) {
        lastPing = hb.lastPing;
        const timeDiff = now - new Date(hb.lastPing);
        extensionStatus = timeDiff > OFFLINE_THRESHOLD ? 'offline' : 'active';

        // Cập nhật status trong DB nếu đã offline
        if (extensionStatus === 'offline' && hb.status !== 'inactive') {
          hb.update({ status: 'inactive' });
        }
      }

      return {
        id: emp.id,
        fullName: emp.fullName,
        email: emp.email,
        username: emp.username,
        extensionStatus, // 'active' | 'offline' | 'not_installed'
        lastPing,
        browser: hb?.browser || null,
        os: hb?.os || null,
        extensionVersion: hb?.extensionVersion || null,
        isRequired: emp.extensionRequirement ? emp.extensionRequirement.isRequired : true
      };
    });

    // Sắp xếp: offline trước, rồi not_installed, cuối cùng active
    const order = { offline: 0, not_installed: 1, active: 2 };
    result.sort((a, b) => order[a.extensionStatus] - order[b.extensionStatus]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de Admin bat/tat yeu cau bat buoc phai cai dat Extension doi voi mot nhan vien cu the
exports.toggleEmployeeRequirement = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { isRequired } = req.body;
    
    await EmployeeExtensionRequirement.upsert({
      employeeId,
      isRequired
    });
    
    res.json({ message: 'Đã cập nhật yêu cầu cài Extension cho nhân viên' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// === LOG SETTINGS ===
// Ham nay dung de lay cau hinh ghi log (ghi tat ca hay chi ghi URL bi chan)
exports.getLogSettings = async (req, res) => {
  try {
    const setting = await Setting.findByPk('LOG_ALL_URLS');
    res.json({ logAllUrls: setting ? setting.value === 'true' : true });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de cap nhat cau hinh ghi log tat ca URL vao bang Setting
exports.updateLogSettings = async (req, res) => {
  try {
    const { logAllUrls } = req.body;
    await Setting.upsert({ key: 'LOG_ALL_URLS', value: logAllUrls ? 'true' : 'false' });
    res.json({ message: 'Đã cập nhật chế độ ghi log' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de lay danh sach nhan vien co dau hieu truy cap bat thuong trong ngay tu bo nho dem Redis
exports.getAnomalyStatus = async (req, res) => {
  try {
    const today = getVietnamDate();
    const employees = await Employee.findAll({
      where: { isDeleted: false },
      attributes: ['id', 'fullName', 'email']
    });
    
    const result = [];
    for (const emp of employees) {
      const blockedCount = parseInt(await redisClient.get(`blocked:${emp.id}:${today}`) || '0');
      if (blockedCount > 0) {
        const isWarned = await redisClient.exists(`warned:${emp.id}:${today}`);
        const isLocked = await redisClient.exists(`locked:${emp.id}:${today}`);
        result.push({
          employee: emp.toJSON(),
          blockedCount,
          status: isLocked ? 'locked' : isWarned ? 'warned' : 'monitoring'
        });
      }
    }
    
    result.sort((a, b) => b.blockedCount - a.blockedCount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin mo khoa tai khoan va xoa bo dem vi pham trong Redis cho nhan vien
exports.unlockEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = getVietnamDate();
    
    // Xóa cả warned + locked + blocked trong Redis
    await redisClient.del(`warned:${employeeId}:${today}`);
    await redisClient.del(`locked:${employeeId}:${today}`);
    await redisClient.del(`blocked:${employeeId}:${today}`);
    
    res.json({ message: 'Đã mở khóa và reset bộ đếm cho nhân viên' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de kiem tra xem nhan vien hien tai co dang bi khoa tai khoan do vi pham bao mat hay khong
exports.checkLocked = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const today = getVietnamDate();
    const isLocked = await redisClient.exists(`locked:${employeeId}:${today}`);
    res.json({ locked: isLocked === 1 });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// === BẮT BUỘC GIẢI TRÌNH BẢO MẬT ===

// Ham nay dung de lay thong tin ban ghi vi pham bao mat dang cho nhan vien nop giai trinh
exports.getPendingViolation = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const violation = await SecurityViolation.findOne({
      where: { employeeId, status: { [Op.in]: ['Pending', 'Submitted'] } },
      order: [['createdAt', 'DESC']]
    });
    res.json({ violation });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho nhan vien nop form giai trinh ly do truy cap trang web cam
// Giai thich code khong thuan: Cap nhat status 'Submitted' va phat tin hieu Socket.io 'new_violation_submitted' den phong admin
exports.submitViolationExplanation = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { violationId, explanation } = req.body;
    
    const violation = await SecurityViolation.findOne({ where: { id: violationId, employeeId } });
    if (!violation) return res.status(404).json({ message: 'Không tìm thấy vi phạm' });
    
    await violation.update({ explanation, status: 'Submitted' });
    
    const io = req.app.get('io');
    if (io) {
      const emp = await Employee.findByPk(employeeId);
      io.to('admin_room').emit('new_violation_submitted', {
        violationId: violation.id,
        employeeName: emp ? emp.fullName : 'Nhân viên',
        message: 'Có một giải trình vi phạm bảo mật mới cần duyệt.'
      });
    }
    
    res.json({ message: 'Đã nộp giải trình thành công, chờ duyệt', violation });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin xem toan bo danh sach cac vu vi pham bao mat trong he thong (Ho tro phan trang)
exports.getViolations = async (req, res) => {
  try {
    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const queryOptions = {
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      const { count, rows } = await SecurityViolation.findAndCountAll(queryOptions);
      return formatPaginatedResponse(res, count, rows, page, limit);
    }

    const violations = await SecurityViolation.findAll(queryOptions);
    res.json(violations);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung cho Admin phe duyet hoac tu choi giai trinh vi pham bao mat
// Giai thich code khong thuan: Neu status la 'Resolved', he thong tu dong xoa khoa block trong Redis va ban socket thong bao den nhan vien
exports.reviewViolation = async (req, res) => {
  try {
    const { violationId, status, adminNote } = req.body; // status: 'Resolved' or 'Rejected'
    
    const violation = await SecurityViolation.findByPk(violationId);
    if (!violation) return res.status(404).json({ message: 'Không tìm thấy vi phạm' });
    
    await violation.update({ status, adminNote });
    
    if (status === 'Resolved') {
      // Bỏ block cho user trong ngày
      const today = getVietnamDate();
      await redisClient.del(`locked:${violation.employeeId}:${today}`);
    }
    
    const io = req.app.get('io');
    if (io) {
      io.to(violation.employeeId.toString()).emit('violation_reviewed', {
        violationId,
        status,
        adminNote
      });
    }
    
    res.json({ message: `Đã ${status === 'Resolved' ? 'duyệt' : 'từ chối'} giải trình`, violation });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
