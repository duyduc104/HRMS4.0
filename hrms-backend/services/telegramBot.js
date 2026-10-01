const TelegramBot = require('node-telegram-bot-api').default || require('node-telegram-bot-api');
const Parser = require('rss-parser');
const axios = require('axios');
const { Solar } = require('lunar-javascript');
const bcrypt = require('bcryptjs');
const { Employee, Payroll, Leave, Salary, TelegramAccount, Attendance, AttendanceExplanation, ScheduledEvent } = require('../models');
const { calculateLeaveDays } = require('../utils/leaveUtils'); // ✅ BUG 3 FIX: Dùng hàm tính phép chung

// Import AI Queue thay thế gọi trực tiếp
const aiQueue = require('./aiQueueService');

// Khởi tạo bot nếu có token
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN chưa được cấu hình. Bot Telegram đang tắt.');
}

const bot = token ? new TelegramBot(token, { polling: true }) : null;

if (bot) {
  console.log('🤖 Telegram Bot đang chạy... (Restarted)');
  
  // Tạo menu lệnh cho Telegram Bot
  bot.setMyCommands([
    { command: 'start', description: 'Bắt đầu sử dụng bot' },
    { command: 'login', description: 'Đăng nhập hệ thống' },
    { command: 'logout', description: 'Đăng xuất tài khoản' },
    { command: 'thongtin', description: 'Xem thông tin cá nhân' },
    { command: 'luong', description: 'Xem bảng lương' },
    { command: 'diemdanh', description: 'Xem giờ check-in hôm nay' },
    { command: 'nghiphep', description: 'Tra cứu quỹ phép' },
    { command: 'xinnghi', description: 'Xin nghỉ phép' },
    { command: 'giaitrinh', description: 'Giải trình chấm công' },
    { command: 'hengio', description: 'Đặt lịch gửi email' },
    { command: 'taohop', description: 'Tạo lịch họp (Google Meet/Jitsi)' },
    { command: 'thoitiet', description: 'Xem thời tiết' },
    { command: 'tintuc', description: 'Đọc tin tức' },
    { command: 'lich', description: 'Xem lịch Âm Dương' }
  ]).catch(err => console.error('Lỗi khi thiết lập menu Telebot:', err));

  // --- CÁC HÀM TIỆN ÍCH ---

  // 1. Tính Âm - Dương Lịch
  function getLunarDate(date) {
    try {
      const solar = Solar.fromDate(date);
      const lunar = solar.getLunar();
      return `Âm lịch: ${lunar.getDay()}/${lunar.getMonth()}/${lunar.getYear()}`;
    } catch (error) {
      return 'Lỗi khi tính ngày âm lịch.';
    }
  }

  // Cache tin tức để tránh việc RSS bị lệch index giữa các lần gọi
  let cachedNews = [];
  let lastNewsFetch = 0;

  // 2. Lấy RSS Tin tức (VNExpress)
  async function getNews() {
    const now = Date.now();
    if (cachedNews.length > 0 && (now - lastNewsFetch) < 10 * 60 * 1000) {
      return cachedNews; // Trả về cache nếu chưa quá 10 phút
    }
    
    try {
      const parser = new Parser();
      const feed = await parser.parseURL('https://vnexpress.net/rss/tin-moi-nhat.rss');
      cachedNews = feed.items.slice(0, 10);
      lastNewsFetch = now;
      return cachedNews;
    } catch (e) {
      console.error('Lỗi khi cào tin tức:', e);
      return cachedNews.length > 0 ? cachedNews : null;
    }
  }

  // 3. Lấy thời tiết (OpenWeatherMap)
  async function getWeather(city = 'Hanoi') {
    const API_KEY = process.env.WEATHER_API_KEY;
    if (!API_KEY) return 'Vui lòng cấu hình WEATHER_API_KEY trong file .env';
    try {
      const res = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=vi`);
      return `⛅ **Thời tiết ${res.data.name}**\n- Nhiệt độ: ${res.data.main.temp}°C\n- Trạng thái: ${res.data.weather[0].description}`;
    } catch (e) {
      return 'Không lấy được dữ liệu thời tiết lúc này.';
    }
  }

  // --- LẮNG NGHE LỆNH (COMMANDS) ---

  // Log mọi tin nhắn đến để debug & Trả lời bằng Llama 3 nếu là text thường
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    console.log(`[TELEGRAM DEBUG] Nhận tin nhắn từ ${msg.from?.first_name}: ${text}`);

    // Bỏ qua nếu tin nhắn rỗng, hoặc là một lệnh (bắt đầu bằng '/')
    if (!text || text.startsWith('/')) return;

    // Kiểm tra login để lấy bối cảnh
    const user = await getAuthenticatedUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, '⚠️ Bạn cần /login để trò chuyện với Trợ lý AI.');
    }

    try {
      bot.sendChatAction(chatId, 'typing');
      const thinkingMsg = await bot.sendMessage(chatId, '💭 *Bot đang suy nghĩ...*', { parse_mode: 'Markdown' });
      
      // Lấy danh sách Role để truyền vào
      const rolesData = await user.getRoles();
      const userRoles = rolesData && rolesData.length > 0 ? rolesData.map(r => r.name) : ['employee'];

      // Đẩy vào Queue
      aiQueue.add({
        source: 'telegram',
        chatId: chatId,
        userId: user.id,
        content: text,
        userRoles: userRoles,
        history: [], // Bot tele hiện chưa hỗ trợ history
        thinkingMessageId: thinkingMsg.message_id
      });
      
    } catch (error) {
      console.error('Lỗi đẩy vào Queue AI Telegram:', error);
      bot.sendMessage(chatId, '❌ Trợ lý AI hiện đang bận hoặc gặp lỗi, vui lòng thử lại sau.');
    }
  });

  // Lệnh: /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    const greetingName = user ? user.fullName : (msg.from.first_name || 'bạn');

    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [
          [{ text: '/diemdanh' }, { text: '/thongtin' }],
          [{ text: '/luong' }, { text: '/nghiphep' }],
          [{ text: '/thoitiet' }, { text: '/tintuc' }],
          [{ text: '/lich' }, { text: '/logout' }]
        ],
        resize_keyboard: true,
        is_persistent: true
      }
    };

    bot.sendMessage(
      chatId,
      `Xin chào <b>${greetingName}</b>!\nTôi là Bot HRMS 4.0.\n\nVui lòng gửi tin nhắn theo cú pháp: \n<code>/login [Username] [Password]</code> để liên kết tài khoản.\n\nSau khi liên kết, bạn có thể dùng menu ở góc trái để chọn các lệnh (hoặc gọi trợ lý AI bằng cách chat thông thường):\n- /logout : Hủy liên kết tài khoản\n- /thongtin [Mã NV] : Xem thông tin\n- /luong : Tra cứu bảng lương\n- /diemdanh : Xem giờ check-in hôm nay\n- /nghiphep : Tra cứu phép\n- /xinnghi [Từ] [Đến] [Lý do] : Tạo xin nghỉ\n- /giaitrinh [Lý do] : Giải trình hôm nay\n- /hengio [HH:mm DD/MM/YYYY] [Email] [Chủ đề] | [Nội dung]\n- /taohop [HH:mm DD/MM/YYYY] [Email] [Tiêu đề]\n- /thoitiet : Xem thời tiết\n- /tintuc : Đọc báo mới\n- /lich : Xem lịch Âm Dương`,
      options
    ).catch(err => console.error("Send message error:", err));
  });

  // Lệnh: /login (Tự động liên kết tài khoản)
  bot.onText(/\/login (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];
    const password = match[2];

    try {
      const emp = await Employee.findOne({ where: { username } });
      if (emp) {
        const isMatch = await bcrypt.compare(password, emp.passwordHash);
        if (!isMatch) {
          return bot.sendMessage(chatId, `❌ Sai tài khoản hoặc mật khẩu!`);
        }
        
        // Đảm bảo quan hệ 1-1: 1 Chat ID chỉ map 1 Nhân viên, và 1 Nhân viên chỉ map 1 Chat ID
        await TelegramAccount.destroy({ where: { chatId: chatId.toString() } });
        await TelegramAccount.destroy({ where: { employeeId: emp.id } });

        await TelegramAccount.create({
          employeeId: emp.id,
          chatId: chatId.toString(),
          username: msg.from.username
        });
        
        bot.sendMessage(chatId, `✅ Liên kết thành công với tài khoản **${emp.fullName}**!\nTừ giờ thông báo chấm công sẽ chỉ gửi về tài khoản Telegram này.`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ Sai mã nhân viên hoặc mật khẩu!`);
      }
    } catch (error) {
      bot.sendMessage(chatId, `Lỗi hệ thống khi đăng nhập.`);
    }
  });

  // Middleware: Kiểm tra liên kết
  async function getAuthenticatedUser(chatId) {
    const tgAccount = await TelegramAccount.findOne({
      where: { chatId: chatId.toString() },
      include: [{ model: Employee, as: 'employee' }]
    });
    return tgAccount ? tgAccount.employee : null;
  }

  // Lệnh: /thongtin
  bot.onText(/\/thongtin(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Bạn chưa đăng nhập. Vui lòng dùng lệnh `/login [Username] [Password]` trước!', { parse_mode: 'Markdown' });

    const targetCode = match[1];
    let targetUser = user;

    if (targetCode) {
      targetUser = await Employee.findOne({ where: { code: targetCode } });
      if (!targetUser) {
        return bot.sendMessage(chatId, `❌ Không tìm thấy nhân viên với mã: ${targetCode}`);
      }
    }

    const joinDateStr = targetUser.joinDate ? new Date(targetUser.joinDate).toLocaleDateString('vi-VN') : 'Chưa cập nhật';

    bot.sendMessage(
      chatId,
      `👤 **Thông tin nhân viên**\n- Mã NV: ${targetUser.code}\n- Username: ${targetUser.username}\n- Họ và tên: **${targetUser.fullName}**\n- Email: ${targetUser.email}\n- Phòng ban: ${targetUser.department || 'Chưa cập nhật'}\n- Vị trí: ${targetUser.position || 'Chưa cập nhật'}\n- Ngày tham gia: ${joinDateStr}\n- Trạng thái: ${targetUser.status || 'Chưa cập nhật'}`,
      { parse_mode: 'Markdown' }
    );
  });

  // Lệnh: /logout
  bot.onText(/\/logout/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const deletedCount = await TelegramAccount.destroy({ where: { chatId: chatId.toString() } });
      if (deletedCount > 0) {
        bot.sendMessage(chatId, '✅ Đã đăng xuất và hủy liên kết tài khoản thành công!');
      } else {
        bot.sendMessage(chatId, '⚠️ Bạn chưa đăng nhập tài khoản nào!');
      }
    } catch (error) {
      console.error('Lỗi khi logout:', error);
      bot.sendMessage(chatId, '❌ Lỗi hệ thống khi đăng xuất.');
    }
  });

  // Lệnh: /luong
  bot.onText(/\/luong/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, 'Vui lòng dùng lệnh `/login [Mã NV] [Password]` trước!', { parse_mode: 'Markdown' });

    const date = new Date();
    try {
      const payroll = await Payroll.findOne({
        where: { employeeId: user.id, periodMonth: date.getMonth() + 1, periodYear: date.getFullYear() }
      });

      if (payroll) {
        const netFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payroll.netSalary);
        bot.sendMessage(
          chatId,
          `💰 **Lương tháng ${payroll.periodMonth}/${payroll.periodYear}**\n- Giờ làm: ${payroll.overtimePay} h\n- Khấu trừ: ${payroll.deductions}\n- Thực nhận: **${netFmt}**\n- Trạng thái: ${payroll.status}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(chatId, 'Chưa có dữ liệu bảng lương tháng này. (Vui lòng bảo HR chạy "Tính lương tự động")');
      }
    } catch (e) {
      bot.sendMessage(chatId, 'Lỗi khi tra cứu lương.');
    }
  });

  // Lệnh: /nghiphep
  bot.onText(/\/nghiphep/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, 'Vui lòng /login trước!');

    try {
      const leaves = await Leave.findAll({
        where: { employeeId: user.id, status: 'Approved' }
      });
      // ✅ BUG 3 FIX: Dùng hàm chung calculateLeaveDays() — kết quả nhất quán với payroll
      const usedDays = calculateLeaveDays(leaves);

      bot.sendMessage(
        chatId,
        `🏖 **Quỹ nghỉ phép của bạn**:\n- Tổng quỹ năm: 12 ngày\n- Đã dùng: ${usedDays} ngày\n- Còn lại: ${12 - usedDays} ngày`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      bot.sendMessage(chatId, 'Lỗi khi tra cứu ngày phép.');
    }
  });

  // Lệnh: /diemdanh
  bot.onText(/\/diemdanh/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, 'Vui lòng /login trước!');

    const today = new Date().toISOString().split('T')[0];
    try {
      const attendance = await Attendance.findOne({
        where: { employeeId: user.id, date: today }
      });

      if (attendance) {
        const checkIn = attendance.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString('vi-VN') : 'Chưa có';
        const checkOut = attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString('vi-VN') : 'Chưa có';
        bot.sendMessage(
          chatId,
          `📍 **Chấm công hôm nay (${today})**\n- Trạng thái: ${attendance.status}\n- Giờ vào: ${checkIn}\n- Giờ ra: ${checkOut}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(chatId, 'Hôm nay bạn chưa có dữ liệu chấm công (Chưa Check-in).');
      }
    } catch (error) {
      bot.sendMessage(chatId, 'Lỗi khi lấy dữ liệu chấm công.');
    }
  });

  // Lệnh: /xinnghi
  bot.onText(/\/xinnghi(?:\s+(.+))?/s, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, 'Vui lòng /login trước!');

    const argsStr = match[1];
    if (!argsStr) {
      return bot.sendMessage(chatId, `⚠️ <b>Sai cú pháp.</b>\n\nVui lòng gõ theo định dạng:\n<code>/xinnghi Ngày_Bắt_Đầu Ngày_Kết_Thúc Lý_Do</code>\n\nVí dụ: <code>/xinnghi 15/06 16/06 Bị ốm</code>`, { parse_mode: 'HTML' });
    }


    
    // Loại bỏ dấu ngoặc vuông nếu người dùng lỡ gõ vào (VD: /xinnghi [15/06] [16/06] [Ốm])
    const cleanArgs = argsStr.replace(/[\[\]]/g, '');
    const parts = cleanArgs.trim().split(/\s+/);

    if (parts.length < 3) {
      return bot.sendMessage(chatId, `⚠️ <b>Thiếu thông tin.</b>\n\nBạn cần cung cấp đủ 3 phần: Từ ngày, Đến ngày và Lý do.\nVí dụ: <code>/xinnghi 15/06 16/06 Bị ốm</code>`, { parse_mode: 'HTML' });
    }

    const fromDateStr = parts[0];
    const toDateStr = parts[1];
    const reason = parts.slice(2).join(' ');

    const parseDate = (str) => {
      const p = str.split(/[\/\-]/);
      const day = parseInt(p[0]);
      const month = parseInt(p[1]);
      let year = new Date().getFullYear();
      if (p[2]) {
        year = parseInt(p[2]);
        if (year < 100) year += 2000;
      }
      return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`);
    };

    try {
      const startDate = parseDate(fromDateStr);
      const endDate = parseDate(toDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return bot.sendMessage(chatId, '⚠️ Ngày tháng không hợp lệ. Vui lòng nhập định dạng dd/mm (VD: 15/06).');
      }

      await Leave.create({
        employeeId: user.id,
        leaveType: 'Annual',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason: reason,
        status: 'Pending',
        approvedBy: null
      });

      bot.sendMessage(chatId, `✅ Đã gửi đơn xin nghỉ phép từ ngày <b>${fromDateStr}</b> đến <b>${toDateStr}</b>.\nLý do: ${reason}\n\nTrạng thái: Đang chờ duyệt.`, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Lỗi khi tạo xin nghỉ:', error);
      bot.sendMessage(chatId, 'Lỗi hệ thống khi tạo đơn nghỉ phép.');
    }
  });

  // Lệnh: /giaitrinh [Lý do]
  bot.onText(/\/giaitrinh (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, 'Vui lòng /login trước!');

    const reason = match[1];
    const today = new Date().toISOString().split('T')[0];

    try {
      await AttendanceExplanation.create({
        employeeId: user.id,
        date: today,
        type: 'Missing_Punch', // Mặc định
        reason: reason,
        status: 'Pending',
        approvedBy: null
      });

      bot.sendMessage(chatId, `✅ Đã gửi đơn giải trình chấm công cho hôm nay (${today}).\nLý do: ${reason}\n\nTrạng thái: Đang chờ duyệt.`);
    } catch (error) {
      console.error('Lỗi khi tạo giải trình:', error);
      bot.sendMessage(chatId, 'Lỗi hệ thống khi tạo đơn giải trình.');
    }
  });

  // Lệnh: /tintuc
  bot.onText(/\/tintuc/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Bạn phải /login để sử dụng chức năng này!');

    const newsItems = await getNews();
    
    if (!newsItems) {
      return bot.sendMessage(chatId, 'Hiện không thể kết nối tới trang tin tức.');
    }

    let newsStr = '📰 <b>TIN MỚI NHẤT (VNEXPRESS)</b>\n\n';
    newsItems.forEach((item, index) => {
      newsStr += `${index + 1}. <a href="${item.link}">${item.title}</a>\n`;
    });
    newsStr += `\n<i>👉 Gõ <code>xem chi tiết [Số]</code> để đọc tóm tắt nội dung (VD: xem chi tiết 1)</i>`;
    
    bot.sendMessage(chatId, newsStr, { parse_mode: 'HTML', disable_web_page_preview: true });
  });

  // Lệnh: xem chi tiết [số]
  bot.onText(/xem chi ti[eế]t(?:\s+(\d+))?/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Bạn phải /login để sử dụng chức năng này!');

    let index = parseInt(match[1]) || 1; // Mặc định xem tin số 1
    
    if (index < 1 || index > 10) {
      return bot.sendMessage(chatId, 'Vui lòng chọn số từ 1 đến 10 (VD: xem chi tiết 1)');
    }

    const newsItems = await getNews();
    if (!newsItems) {
      return bot.sendMessage(chatId, 'Hiện không thể kết nối tới trang tin tức.');
    }

    const item = newsItems[index - 1];
    if (item) {
      const detailStr = `🗞 <b>${item.title}</b>\n\n${item.contentSnippet}\n\n👉 <a href="${item.link}">Đọc bài viết đầy đủ tại đây</a>`;
      bot.sendMessage(chatId, detailStr, { parse_mode: 'HTML' });
    }
  });

  // Lệnh: /thoitiet
  bot.onText(/\/thoitiet(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Bạn phải /login để sử dụng chức năng này!');

    const city = match[1] || 'Hanoi'; // Mặc định là Hanoi
    const weather = await getWeather(city);
    bot.sendMessage(chatId, weather, { parse_mode: 'Markdown' });
  });

  // Lệnh: /lich
  bot.onText(/\/lich/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Bạn phải /login để sử dụng chức năng này!');

    const date = new Date();
    const solarStr = `Dương lịch: Hôm nay, ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    const lunarStr = getLunarDate(date);
    bot.sendMessage(chatId, `📅 **Lịch Hôm Nay**\n- ${solarStr}\n- ${lunarStr}`, { parse_mode: 'Markdown' });
  });

  // Lệnh: /hengio [HH:mm DD/MM/YYYY] [Email] [Chủ đề] | [Nội dung]
  bot.onText(/\/hengio\s+([\d]{2}:[\d]{2}\s+[\d]{2}\/[\d]{2}\/[\d]{4})\s+([^\s]+)\s+([^|]+)\|\s*(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Bạn phải /login để sử dụng chức năng này!');

    const timeStr = match[1]; // VD: 15:30 15/06/2026
    const to = match[2]; // VD: admin@hrms.com, ALL, DEPT:IT
    const subject = match[3].trim(); // VD: Họp Team
    const body = match[4].trim(); // VD: Nội dung họp

    try {
      // Parse time
      const [timePart, datePart] = timeStr.split(' ');
      const [hours, minutes] = timePart.split(':');
      const [day, month, year] = datePart.split('/');
      
      const scheduledAt = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);

      if (isNaN(scheduledAt.getTime())) {
        return bot.sendMessage(chatId, '⚠️ Định dạng ngày giờ không hợp lệ. Ví dụ đúng: `15:30 15/06/2026`', { parse_mode: 'Markdown' });
      }

      if (scheduledAt < new Date()) {
        return bot.sendMessage(chatId, '⚠️ Thời gian hẹn phải nằm trong tương lai!');
      }

      // Xử lý list email
      let finalRecipients = to;
      if (to === 'ALL') {
        const allEmps = await Employee.findAll({ where: { isDeleted: false }, attributes: ['email'] });
        finalRecipients = allEmps.map(e => e.email).filter(Boolean).join(', ');
      } else if (to.startsWith('DEPT:')) {
        const deptName = to.substring(5);
        const deptEmps = await Employee.findAll({ 
          where: { department: deptName, isDeleted: false },
          attributes: ['email']
        });
        finalRecipients = deptEmps.map(e => e.email).filter(Boolean).join(', ');
      }

      if (!finalRecipients) {
        return bot.sendMessage(chatId, '❌ Không tìm thấy email người nhận hợp lệ theo yêu cầu.');
      }

      await ScheduledEvent.create({
        creatorId: user.id,
        title: `Hẹn qua Telegram: ${subject}`,
        type: 'EMAIL',
        scheduledAt: scheduledAt,
        status: 'PENDING',
        payload: { to: finalRecipients, subject, body, attachments: [] }
      });

      bot.sendMessage(chatId, `✅ **Đã lên lịch gửi Email thành công!**\n- Thời gian gửi: ${timeStr}\n- Người nhận: ${to}\n- Tiêu đề: ${subject}`, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Lỗi khi đặt lịch qua telegram:', error);
      bot.sendMessage(chatId, '❌ Lỗi hệ thống khi thiết lập lịch gửi.');
    }
  });

  // Lệnh: /taohop [HH:mm DD/MM/YYYY] [Email] [Tiêu đề]
  bot.onText(/\/taohop\s+([\d]{2}:[\d]{2}\s+[\d]{2}\/[\d]{2}\/[\d]{4})\s+([^\s]+)\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getAuthenticatedUser(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Bạn phải /login để sử dụng chức năng này!');

    const timeStr = match[1]; // VD: 15:30 15/06/2026
    const to = match[2]; // VD: admin@hrms.com, ALL, DEPT:IT
    const title = match[3].trim(); // VD: Họp Team

    try {
      const [timePart, datePart] = timeStr.split(' ');
      const [hours, minutes] = timePart.split(':');
      const [day, month, year] = datePart.split('/');
      const scheduledAt = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);

      if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
        return bot.sendMessage(chatId, '⚠️ Định dạng ngày giờ không hợp lệ hoặc ở quá khứ. Ví dụ: `15:30 15/06/2026`', { parse_mode: 'Markdown' });
      }

      let finalRecipients = to;
      if (to === 'ALL') {
        const allEmps = await Employee.findAll({ where: { isDeleted: false }, attributes: ['email'] });
        finalRecipients = allEmps.map(e => e.email).filter(Boolean).join(', ');
      } else if (to.startsWith('DEPT:')) {
        const deptName = to.substring(5);
        const deptEmps = await Employee.findAll({ where: { department: deptName, isDeleted: false }, attributes: ['email'] });
        finalRecipients = deptEmps.map(e => e.email).filter(Boolean).join(', ');
      }

      if (!finalRecipients) {
        return bot.sendMessage(chatId, '❌ Không tìm thấy email người nhận hợp lệ.');
      }

      // Sinh Google Meet
      let meetLink = '';
      try {
        const googleCalendarController = require('./googleCalendarController');
        const { google } = require('googleapis');
        const authClient = await googleCalendarController.getAuthenticatedClient(user.id);
        if (authClient) {
          const calendar = google.calendar({ version: 'v3', auth: authClient });
          const resGcal = await calendar.events.insert({
            calendarId: 'primary',
            resource: {
              summary: `Họp: ${title}`,
              start: { dateTime: scheduledAt.toISOString() },
              end: { dateTime: new Date(scheduledAt.getTime() + 60*60*1000).toISOString() },
              conferenceData: {
                createRequest: {
                  requestId: require('crypto').randomUUID(),
                  conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
              }
            },
            conferenceDataVersion: 1
          });
          meetLink = resGcal.data.hangoutLink;
        }
      } catch (err) {
        console.error('Lỗi tạo Google Meet từ Telebot:', err);
      }

      if (!meetLink) {
        meetLink = `https://meet.jit.si/HRMS_Meeting_${Math.random().toString(36).substring(2, 12)}`;
      }

      await ScheduledEvent.create({
        creatorId: user.id,
        title: `Họp: ${title}`,
        type: 'MEETING',
        scheduledAt: scheduledAt,
        status: 'PENDING',
        meetLink: meetLink,
        payload: { 
          to: finalRecipients, 
          subject: `Mời họp: ${title}`, 
          body: `Bạn được mời tham gia cuộc họp: ${title}\nThời gian: ${timeStr}\nLink họp: ${meetLink}`,
          participants: finalRecipients, 
          title: title, 
          location: meetLink, 
          attachments: [] 
        }
      });

      bot.sendMessage(chatId, `✅ **Đã lên lịch họp thành công!**\n- Thời gian: ${timeStr}\n- Người tham gia: ${to}\n- Tiêu đề: ${title}\n- Link họp: ${meetLink}`, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Lỗi khi đặt lịch họp qua telebot:', error);
      bot.sendMessage(chatId, '❌ Lỗi hệ thống khi thiết lập lịch họp.');
    }
  });

  // Error handling
  bot.on('polling_error', (error) => {
    if (error.code === 'ETELEGRAM' && error.message && error.message.includes('409')) {
      console.warn('⚠️ [Telegram] Conflict 409: Bot đang chạy ở nhiều tiến trình cùng lúc. Hãy tắt các tiến trình Node.js khác.');
    } else {
      console.warn('⚠️ [Telegram] Lỗi polling:', error.code, error.message?.substring(0, 200));
    }
  });

  // Export helper function to send notifications from web
  bot.notifyUserAction = async (employeeId, text, imageUrlOrBase64 = null) => {
    try {
      const tgAccount = await TelegramAccount.findOne({ where: { employeeId } });
      if (tgAccount && tgAccount.chatId) {
        if (imageUrlOrBase64) {
          let photoData = imageUrlOrBase64;
          
          // Check if it's a base64 string (from frontend canvas)
          if (typeof imageUrlOrBase64 === 'string' && imageUrlOrBase64.startsWith('data:image')) {
            // Extract the base64 part
            const base64Data = imageUrlOrBase64.replace(/^data:image\/\w+;base64,/, '');
            photoData = Buffer.from(base64Data, 'base64');
          }
          
          await bot.sendPhoto(tgAccount.chatId, photoData, { caption: text, parse_mode: 'HTML' });
        } else {
          await bot.sendMessage(tgAccount.chatId, text, { parse_mode: 'HTML' });
        }
      }
    } catch (e) {
      console.error('[TELEGRAM] Error sending notification:', e.message);
    }
  };
}

module.exports = bot;
