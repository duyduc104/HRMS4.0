const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const webFilterRoutes = require('./routes/webFilterRoutes');
const chatRoutes = require('./routes/chatRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const roleRoutes = require('./routes/roleRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

// Load environment variables
dotenv.config();

// Khởi tạo kết nối Redis
require('./config/redisClient');

const app = express();

// Middleware config
// Enable CORS for React JS frontend (Assuming it runs on port 5173 for Vite or 3000 for CRA)
const corsOptions = {
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Tăng limit cho face vector payload và hình ảnh
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Phục vụ thư mục public/uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HRMS Backend is running' });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Attendance Routes
app.use('/api/attendance', attendanceRoutes);

// Web Filter Routes
app.use('/api/web-filters', webFilterRoutes);

// Security AI Routes
app.use('/api/security-ai', require('./routes/securityAIRoutes'));

// Employee Routes
app.use('/api/employees', require('./routes/employeeRoutes'));

// Onboarding Routes
app.use('/api/onboarding', require('./routes/onboardingRoutes'));

// Chat Routes
app.use('/api/chat', chatRoutes);

// Leave & Explanation Routes
app.use('/api/leaves', leaveRoutes);

// Scheduled Event Routes
app.use('/api/events', require('./routes/scheduledEventRoutes'));

// Upload Routes (Hỗ trợ file lớn / chunking)
app.use('/api/upload', require('./routes/uploadRoutes'));

// Role Routes
app.use('/api/roles', roleRoutes);

// Navigation Menu Routes
app.use('/api/menu', require('./routes/menuRoutes'));

// Department Routes
app.use('/api/departments', departmentRoutes);

// Payroll Routes
app.use('/api/payroll', payrollRoutes);
app.use('/api/advance-requests', require('./routes/advanceRequestRoutes'));

// SePay Routes (Test/Simulation)
app.use('/api/sepay', require('./routes/sepayRoutes'));

// Analytics Routes (Dashboard)
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Settings Routes
app.use('/api/settings', settingsRoutes);

// Policy & Document Routes
app.use('/api/policies', require('./routes/policyRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));

// KPI / Performance Routes
app.use('/api/kpis', require('./routes/kpiRoutes'));

// Granular RBAC Permission Routes
app.use('/api/permissions', require('./routes/permissionRoutes'));

// Sync Database and Start Server
const PORT = process.env.PORT || 5000;

// ======================= CRON JOB (Event Scheduler) =======================
const cron = require('node-cron');
const { ScheduledEvent } = require('./models');
const nodemailer = require('nodemailer');

// Guard flag: chống đăng ký cron nhiều lần khi nodemon hot-reload
// Trong nodemon, module cache bị xóa nhưng process vẫn giữ nguyên,
// nên biến module-level này sẽ reset về false sau mỗi lần reload.
// Giải pháp bền vững là dùng process-level global.
if (!global._emailCronStarted) {
  global._emailCronStarted = false;
}

const startServer = async () => {
  try {
    // Authenticate and sync with Database
    await sequelize.authenticate();
    console.log('✅ Connection to SQL Server has been established successfully.');

    // Tự động dọn dẹp các bảng phân quyền cũ
    try {
      await sequelize.query(`
        IF OBJECT_ID(N'[DepartmentPermissions]', N'U') IS NOT NULL DROP TABLE [DepartmentPermissions];
        IF OBJECT_ID(N'[EmployeePermissions]', N'U') IS NOT NULL DROP TABLE [EmployeePermissions];
      `);
      console.log('✅ Đã dọn dẹp các bảng phân quyền RBAC cũ khỏi Database.');
    } catch (colErr) {
      console.warn('Cảnh báo khi dọn dẹp bảng RBAC:', colErr.message);
    }
    
    // Sync models with database (without alter to avoid MSSQL UNIQUE syntax bug)
    await sequelize.sync();
    console.log('✅ All models were synchronized successfully.');

    // Seed Roles
    const { Role } = require('./models');
    const ROLES = require('./constants/roles');
    const defaultRoles = Object.values(ROLES);
    for (const roleName of defaultRoles) {
      await Role.findOrCreate({ where: { name: roleName }, defaults: { description: `Role for ${roleName}` } });
    }
    console.log('✅ Default roles verified/seeded.');

    // Seed Navigation Menus
    const menuController = require('./controllers/menuController');
    await menuController.seedDefaultMenus();

    const server = http.createServer(app);
    const setupSocket = require('./socket');
    const io = setupSocket(server);
    app.set('io', io);
    global.io = io; // Expose io globally cho Queue Service

    // Khởi tạo AI Queue Worker
    require('./services/aiQueueService');

    // Bắt đầu chạy Telegram Bot
    require('./services/telegramBot');

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please kill the existing process and restart.`);
        process.exit(1); // Exit cleanly so nodemon can restart properly
      } else {
        throw err;
      }
    });

    // ===== CRON GUARD: dùng global để tránh đăng ký khi nodemon hot-reload =====
    if (!global._emailCronStarted) {
      global._emailCronStarted = true;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER || 'test@ethereal.email',
          pass: process.env.SMTP_PASS || 'pass'
        }
      });

      // Run every minute
      cron.schedule('* * * * *', async () => {
        try {
          const now = new Date();
          
          // Sử dụng transaction để khóa các record (tránh race condition khi người dùng đang sửa đúng lúc này)
          const pendingEvents = await sequelize.transaction(async (t) => {
            const events = await ScheduledEvent.findAll({
              where: {
                status: 'PENDING',
                type: 'EMAIL',
                scheduledAt: { [require('sequelize').Op.lte]: now }
              },
              transaction: t,
              lock: t.LOCK.UPDATE
            });
            
            for (const e of events) {
              await e.update({ status: 'PROCESSING' }, { transaction: t });
            }
            return events;
          });

          for (const event of pendingEvents) {
            try {
              const { to, subject, body, attachments } = event.payload || {};
              if (to && subject && body) {
                
                // Process sending email with attachments
                await transporter.sendMail({
                  from: '"HRMS System" <admin@hrms.com>',
                  to,
                  subject,
                  html: body,
                  attachments: attachments || [] // array of objects: { filename, path }
                });
                
                console.log("[Cron] Successfully sent scheduled email: " + event.id);
                await ScheduledEvent.update({ status: 'COMPLETED' }, { where: { id: event.id } });

                // Gửi realtime notification
                const ioInstance = app.get('io');
                if (ioInstance && to) {
                  const { Employee } = require('./models');
                  const emails = to.split(',').map(e => e.trim());
                  const emps = await Employee.findAll({ where: { email: emails, isDeleted: false }, attributes: ['id'] });
                  
                  emps.forEach(emp => {
                    ioInstance.to(emp.id.toString()).emit('new_notification', {
                      title: 'Email tự động: ' + event.title,
                      message: `Đã gửi lúc ${new Date().toLocaleString('vi-VN')}`,
                      type: 'EMAIL',
                      link: '/events'
                    });
                  });
                  // Đồng thời báo cho người tạo
                  ioInstance.to(event.creatorId.toString()).emit('new_notification', {
                    title: 'Hệ thống đã gửi: ' + event.title,
                    message: `Đã gửi lúc ${new Date().toLocaleString('vi-VN')}`,
                    type: 'SYSTEM',
                    link: '/events'
                  });
                }
              } else {
                await ScheduledEvent.update({ status: 'FAILED' }, { where: { id: event.id } });
              }
            } catch (err) {
              console.error("[Cron] Error sending email event " + event.id + ":", err);
              await ScheduledEvent.update({ status: 'FAILED' }, { where: { id: event.id } });
            }
          }

          // ===== CRON DÀNH CHO BẢNG CHÍNH SÁCH & TÀI LIỆU (POLICY DOCUMENTS) =====
          try {
            const { PolicyDocument, Employee } = require('./models');
            const policyController = require('./controllers/policyController');
            const scheduledPolicies = await PolicyDocument.findAll({
              where: {
                status: 'SCHEDULED',
                scheduledPublishAt: { [require('sequelize').Op.lte]: now }
              },
              include: [
                { model: Employee, as: 'contactPerson', attributes: ['id', 'fullName', 'email', 'department', 'username'] }
              ]
            });

            for (const policy of scheduledPolicies) {
              await policy.update({ status: 'PUBLISHED' });
              console.log(`[Cron Policy] ✅ Đã tự động phát hành chính sách theo lịch: "${policy.title}"`);

              // 1. Phát sự kiện Socket Realtime
              const ioInstance = app.get('io');
              if (ioInstance) {
                ioInstance.emit('new_policy_announcement', {
                  policy,
                  message: `📢 THÔNG BÁO CHÍNH SÁCH MỚI: ${policy.title}`
                });
              }

              // 2. Tự động gửi Email thông báo cho nhân viên được phân quyền
              policyController.sendPolicyNotificationEmails(policy).catch(err => {
                console.error(`[Cron Policy Email Error] ${policy.title}:`, err);
              });
            }
          } catch (policyCronErr) {
            console.error("[Cron Policy Error]:", policyCronErr);
          }

        } catch (error) {
          console.error("[Cron] Error scanning pending events:", error);
        }
      });

      console.log('✅ Email scheduler cron job started (once).');

      // ===== CRON: NHẮC GIẢI TRÌNH ĐI MUỘN HÀNG NGÀY (9:00 sáng, T2-T6) =====
      cron.schedule('0 9 * * 1-5', async () => {
        console.log('[Cron Late Reminder] ⏰ Bắt đầu quét nhắc giải trình...');
        try {
          const { Attendance, AttendanceExplanation, Employee } = require('./models');
          const now = new Date();
          const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const ioInstance = app.get('io');
          
          // 1. Tìm nhân viên đi muộn HÔM QUA mà chưa nộp giải trình
          const lateYesterday = await Attendance.findAll({
            where: { date: yesterday, status: 'Late' },
            include: [{ model: Employee, as: 'employee', where: { isDeleted: false }, attributes: ['id', 'fullName', 'email'] }]
          });
          
          let reminderCount = 0;
          for (const record of lateYesterday) {
            const hasExplanation = await AttendanceExplanation.findOne({
              where: { employeeId: record.employeeId, date: yesterday }
            });
            
            if (!hasExplanation && record.employee?.email) {
              // Gửi email nhắc
              transporter.sendMail({
                from: '"HRMS System" <admin@hrms.com>',
                to: record.employee.email,
                subject: `📝 Nhắc nhở: Giải trình đi muộn ngày ${yesterday}`,
                html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #f59e0b;">📝 Nhắc nhở giải trình</h2>
                  <p>Xin chào <b>${record.employee.fullName}</b>,</p>
                  <p>Hệ thống ghi nhận bạn đã <b style="color: #ef4444;">đi muộn</b> vào ngày <b>${yesterday}</b> nhưng chưa nộp đơn giải trình.</p>
                  <p>Vui lòng nộp giải trình trước cuối ngày hôm nay:</p>
                  <a href="${frontendUrl}/leave?tab=my-explanation" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Viết giải trình ngay</a>
                  <p style="color: #71717a; font-size: 13px; margin-top: 24px;">Email này được gửi tự động bởi hệ thống HRMS mỗi ngày.</p>
                </div>`
              }).catch(err => console.error(`[Cron Late] Mail error:`, err.message));
              
              // Socket notification
              if (ioInstance) {
                ioInstance.to(record.employeeId.toString()).emit('new_notification', {
                  title: '📝 Nhắc giải trình đi muộn',
                  message: `Bạn chưa giải trình đi muộn ngày ${yesterday}`,
                  type: 'ATTENDANCE',
                  link: `/leave?tab=my-explanation`
                });
              }
              
              reminderCount++;
            }
          }
          
          // 2. Quét tháng: ai đi muộn ≥3 lần → gửi email cảnh báo tổng hợp
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          
          const allLateRecords = await Attendance.findAll({
            where: { status: 'Late', date: { [require('sequelize').Op.between]: [startOfMonth, endOfMonth] } },
            include: [{ model: Employee, as: 'employee', where: { isDeleted: false }, attributes: ['id', 'fullName', 'email'] }]
          });
          
          // Nhóm theo nhân viên
          const lateMap = {};
          allLateRecords.forEach(r => {
            if (!r.employee) return;
            if (!lateMap[r.employeeId]) {
              lateMap[r.employeeId] = { employee: r.employee, count: 0 };
            }
            lateMap[r.employeeId].count++;
          });
          
          // Gửi cảnh báo cho ai ≥3 lần
          const month = now.getMonth() + 1;
          for (const [empId, data] of Object.entries(lateMap)) {
            if (data.count >= 3 && data.employee.email) {
              transporter.sendMail({
                from: '"HRMS System" <admin@hrms.com>',
                to: data.employee.email,
                subject: `🚨 Cảnh báo: Đã đi muộn ${data.count} lần trong tháng ${month}`,
                html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #ef4444;">🚨 Cảnh báo vi phạm chấm công</h2>
                  <p>Xin chào <b>${data.employee.fullName}</b>,</p>
                  <p>Bạn đã đi muộn <b style="color: #ef4444; font-size: 24px;">${data.count} lần</b> trong tháng ${month}.</p>
                  <p>Điều này có thể ảnh hưởng đến đánh giá thi đua và bảng lương.</p>
                  <p>Vui lòng chú ý giờ giấc và nộp giải trình cho những ngày chưa giải trình.</p>
                </div>`
              }).catch(err => console.error(`[Cron Late Warning] Mail error:`, err.message));
            }
          }
          
          console.log(`[Cron Late Reminder] ✅ Đã gửi ${reminderCount} email nhắc giải trình. ${Object.keys(lateMap).length} NV có record đi muộn tháng này.`);
        } catch (error) {
          console.error('[Cron Late Reminder] ❌ Error:', error);
        }
      });
      console.log('✅ Late reminder cron job started (9:00 AM, Mon-Fri).');
    } else {
      console.log('⚠️  Cron job already running, skipping re-registration.');
    }

  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

startServer();
