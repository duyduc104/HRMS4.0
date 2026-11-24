const { GoogleGenAI } = require('@google/genai');
const { Leave, Payroll, Employee, Attendance, AttendanceExplanation, ScheduledEvent, PolicyDocument } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const Parser = require('rss-parser');

// Configure Google GenAI only if key exists
const apiKey = process.env.GEMINI_API_KEY;
// Lấy tên model từ cấu hình (.env), mặc định dùng gemini-1.5-flash (an toàn hơn cho quota free) hoặc gemini-2.5-flash tùy bạn cấu hình.
const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// Service tich hop tri tue nhan tao Google Gemini AI Agent, Function Calling va ChatOps
// Giai thich code khong thuan:
// - Su dung SDK @google/genai khoi tao model gemini-2.5-flash ho tro multi-turn chat va function calling.
// - Khai bao hon 15 Function Declarations cho phep AI tu dong quyet dinh goi tool nghiep vu (truy van cham cong, nghi phep, bang luong, tao lich hop Meet, gui mail).
// - ChatOps: AI tra ve block markdown ```chatops chua JSON de Frontend tu dong render Form xin nghi phep hoac ve bieu do dong (bar, line, pie chart).
// - Co che kiem soat quyen han chat che: Nhan vien binh thuong bi chan truy cap so lieu luong hoac cham cong phong ban qua cac tool manager_.

// Cache tin tuc
let cachedNews = [];
let lastNewsFetch = 0;

// Ham nay dung de cao du lieu tin tuc moi nhat tu RSS VnExpress va luu cache trong bo nho RAM 10 phut
async function getNews() {
  const now = Date.now();
  if (cachedNews.length > 0 && (now - lastNewsFetch) < 10 * 60 * 1000) {
    return cachedNews;
  }
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://vnexpress.net/rss/tin-moi-nhat.rss');
    cachedNews = feed.items.slice(0, 10).map(i => ({ title: i.title, link: i.link, content: i.contentSnippet }));
    lastNewsFetch = now;
    return cachedNews;
  } catch (e) {
    console.error('Lỗi khi cào tin tức:', e);
    return { error: 'Không thể lấy tin tức' };
  }
}

// Ham nay dung de goi API OpenWeatherMap lay thong tin nhiet do va thoi tiet theo ten thanh pho
async function getWeather(city) {
  const API_KEY = process.env.WEATHER_API_KEY;
  if (!API_KEY) return { error: 'Vui lòng cấu hình WEATHER_API_KEY trong file .env' };
  try {
    const res = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=vi`);
    return {
      name: res.data.name,
      temp: res.data.main.temp,
      description: res.data.weather[0].description
    };
  } catch (e) {
    return { error: 'Không lấy được dữ liệu thời tiết lúc này.' };
  }
}

// Ham nay dung de xu ly hoi dap thong minh voi AI Agent, dieu phoi Function Calling tra cuu du lieu va sinh ChatOps
async function handleAIQuery(userId, userMessage, userRoles = [], history = [], currentPath = '') {
  if (!ai) {
    return "Hệ thống AI chưa được cấu hình API Key. Vui lòng liên hệ Admin cấu hình GEMINI_API_KEY.";
  }

  const isAdmin = userRoles.includes('admin') || userRoles.includes('hr_manager');
  const isManager = userRoles.includes('department_manager') || isAdmin;

  let roleInstructions = '';
  if (isAdmin) {
    roleInstructions = `
- Danh sách nhân viên (Quản lý): /employees
- Bảng lương (Quản lý): /payroll
- Cài đặt hệ thống (Admin): /settings
- Bảo mật / Access Log / Web Filter (Admin): /security`;
  } else if (isManager) {
    roleInstructions = `
- Danh sách nhân viên (Quản lý): /employees`;
  }

  let formattedHistory = [];
  if (Array.isArray(history)) {
    formattedHistory = history
      .filter(m => m.senderId !== 'system')
      .map(m => ({
        role: m.senderId === 'me' ? 'user' : 'model',
        parts: [{ text: m.content || '' }]
      }));
  }

  try {
    const chat = ai.chats.create({
      model: AI_MODEL,
      history: formattedHistory,
      config: {
        systemInstruction: `Bạn là trợ lý AI chuyên biệt của hệ thống HRMS.
QUAN TRỌNG: Bạn được phép trả lời và hỗ trợ MỌI VẤN ĐỀ, tính năng, và dữ liệu thuộc phạm vi hệ thống HRMS này. CHỈ TỪ CHỐI các câu hỏi hoàn toàn không liên quan đến công việc hoặc dự án (ví dụ: toán học đố vui, lịch sử thế giới, lập trình chung, thơ ca...).
KHI CUNG CẤP DỮ LIỆU: Bạn PHẢI KIỂM TRA QUYỀN (Roles) của người dùng hiện tại một cách khắt khe. Bất cứ dữ liệu nào trong hệ thống đều có thể được hỏi, nhưng nếu người dùng không đủ quyền (ví dụ: nhân viên thường muốn xem lương người khác, hoặc xem log bảo mật của admin), hãy từ chối lịch sự và báo rằng họ không có quyền truy cập thông tin này.

Bạn đang trò chuyện với một người dùng có các quyền: ${userRoles.join(', ')}.
Thời gian hiện tại của hệ thống là: ${new Date().toISOString()} (hãy dùng thông tin này khi người dùng hỏi về ngày tháng năm).
${currentPath ? `Ngữ cảnh màn hình hiện tại của người dùng là: ${currentPath}. Nếu câu hỏi liên quan đến nội dung màn hình hiện tại, hãy cân nhắc sử dụng các tool tương ứng (ví dụ: đang ở /events thì dùng get_my_events) để lấy dữ liệu trang đó.` : ''}

CÁC QUY TẮC QUAN TRỌNG:
1. Nếu bạn phát hiện người dùng đi muộn (dựa vào tool get_attendance_today), hãy nhắc nhở và GỢI Ý họ tạo đơn giải trình chấm công (bạn có tool create_attendance_explanation).
2. Khi người dùng muốn xem thời tiết hoặc đọc báo, hãy tự động gọi tool get_weather hoặc get_news.
3. Nếu người dùng muốn nhắc nhở, gửi email vào giờ cụ thể, hãy gọi tool schedule_email. Nếu người dùng muốn lên lịch họp (meeting), hãy gọi tool schedule_meeting.
4. Quyền Quản Lý: Nếu user là manager hoặc admin, họ có thể hỏi số liệu chung (hôm nay ai đi muộn, ai nghỉ, tổng lương). Hãy gọi các tool manager_. Nếu họ không có quyền, từ chối nhẹ nhàng.
5. Nếu người dùng hỏi hoặc muốn tra cứu về chính sách/quy định/tài liệu công ty, hãy gọi tool search_policies để tìm, sau đó hướng dẫn họ nhấn vào [Tên Tài liệu](/policies) để xem chi tiết và chat với tài liệu đó.
6. Khi cung cấp link trang nội bộ, hãy dùng markdown (VD: [Bấm vào đây để tới Chấm công](/attendance)).
Các trang nội bộ hợp lệ:
- Trang chủ: /
- Chấm công: /attendance
- Nghỉ phép: /leave
- Hồ sơ: /profile
- Bảng tin: /feed
- Onboarding: /onboarding
- Chính sách và Tài liệu: /policies
- Chat: /chat${roleInstructions}

TÍNH NĂNG CHATOPS (QUAN TRỌNG):
1. Khi người dùng muốn xin nghỉ phép (tạo đơn), KHÔNG gọi tool \`create_leave_request\` nữa. Hãy trả về CHÍNH XÁC một khối mã markdown ngôn ngữ là \`chatops\` với JSON chứa thông tin đơn nghỉ phép để giao diện tự hiển thị Form. (Định dạng startDate/endDate là YYYY-MM-DDTHH:mm:00). Ví dụ:
\`\`\`chatops
{
  "type": "leave_request",
  "leaveType": "Annual",
  "startDate": "2026-07-21T08:00:00",
  "endDate": "2026-07-21T17:00:00",
  "reason": "Nghỉ ốm"
}
\`\`\`

2. Khi Quản lý yêu cầu "vẽ biểu đồ" (ví dụ vẽ biểu đồ số người đi muộn, thống kê nhân viên nghỉ phép), hãy gọi các tool \`manager_get_...\` để lấy dữ liệu thực tế, tổng hợp lại và trả về khối mã \`chatops\` sau để giao diện tự vẽ biểu đồ:
\`\`\`chatops
{
  "type": "chart",
  "chartData": {
    "chartType": "bar",
    "title": "Biểu đồ Đi muộn Tuần này",
    "xKey": "name",
    "yKey": "value",
    "data": [
      { "name": "Nguyễn Văn A", "value": 2 },
      { "name": "Trần Thị B", "value": 1 }
    ]
  }
}
\`\`\` (chartType có thể là bar, line, pie).`,
        tools: [
          {
            functionDeclarations: [
              {
                name: "get_leave_balance",
                description: "Lấy thông tin số ngày phép của nhân viên đang chat.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "get_leave_requests",
                description: "Lấy danh sách các đơn nghỉ phép gần đây của nhân viên đang chat.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "get_salary",
                description: "Lấy thông tin lương của nhân viên đang chat trong một tháng cụ thể.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    month: { type: "NUMBER", description: "Tháng (1-12)" },
                    year: { type: "NUMBER", description: "Năm (VD: 2026)" }
                  },
                  required: ["month"]
                }
              },
              {
                name: "create_leave_request",
                description: "Tạo đơn xin nghỉ phép.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    leaveType: { type: "STRING", enum: ["Annual"], description: "Loại phép (mặc định Annual)" },
                    startDate: { type: "STRING", description: "Bắt đầu (YYYY-MM-DDTHH:mm:00)" },
                    endDate: { type: "STRING", description: "Kết thúc (YYYY-MM-DDTHH:mm:00)" },
                    reason: { type: "STRING", description: "Lý do xin nghỉ" }
                  },
                  required: ["leaveType", "startDate", "endDate", "reason"]
                }
              },
              {
                name: "get_attendance_today",
                description: "Lấy thông tin giờ vào/ra của người dùng trong ngày hôm nay.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "get_attendance_late_this_month",
                description: "Đếm số lần đi muộn của người dùng trong tháng này.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "check_missing_punch",
                description: "Kiểm tra tình trạng chấm công của một ngày cụ thể (để xem có quên chấm công không).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    date: { type: "STRING", description: "Ngày cần tra (YYYY-MM-DD)" }
                  },
                  required: ["date"]
                }
              },
              {
                name: "create_attendance_explanation",
                description: "Tạo đơn giải trình chấm công khi đi muộn hoặc quên chấm công.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    type: { type: "STRING", enum: ["Late", "Missing_Punch", "Leave_Early"], description: "Loại giải trình" },
                    date: { type: "STRING", description: "Ngày (YYYY-MM-DD)" },
                    reason: { type: "STRING", description: "Lý do giải trình" }
                  },
                  required: ["type", "date", "reason"]
                }
              },
              {
                name: "manager_get_leave_today",
                description: "Dành cho quản lý: Lấy danh sách nhân viên đang nghỉ phép hôm nay.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "manager_get_late_this_week",
                description: "Dành cho quản lý: Liệt kê danh sách nhân viên đi muộn trong tuần này.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "manager_get_total_payroll",
                description: "Dành cho quản lý: Lấy tổng quỹ lương phải trả trong một tháng.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    month: { type: "NUMBER", description: "Tháng (1-12)" },
                    year: { type: "NUMBER", description: "Năm (VD: 2026)" }
                  },
                  required: ["month", "year"]
                }
              },
              {
                name: "schedule_email",
                description: "Lên lịch hẹn giờ tự động gửi email/thông báo.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    timeStr: { type: "STRING", description: "Thời gian (HH:mm DD/MM/YYYY) (VD: 15:30 15/06/2026)" },
                    to: { type: "STRING", description: "Email người nhận (dùng ALL để gửi tất cả, DEPT:TenPhong cho phòng ban)" },
                    subject: { type: "STRING", description: "Chủ đề" },
                    body: { type: "STRING", description: "Nội dung" }
                  },
                  required: ["timeStr", "to", "subject", "body"]
                }
              },
              {
                name: "schedule_meeting",
                description: "Lên lịch một cuộc họp (meeting).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Tiêu đề cuộc họp" },
                    timeStr: { type: "STRING", description: "Thời gian (HH:mm DD/MM/YYYY) (VD: 15:30 15/06/2026)" },
                    participants: { type: "STRING", description: "Người tham gia (Email hoặc 'ALL' hoặc 'DEPT:TenPhong')" },
                    location: { type: "STRING", description: "Địa điểm hoặc Link meeting (có thể bỏ trống, hệ thống sẽ tự sinh ID)" }
                  },
                  required: ["title", "timeStr", "participants"]
                }
              },
              {
                name: "search_policies",
                description: "Tìm kiếm các tài liệu, chính sách, quy định của công ty.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    keyword: { type: "STRING", description: "Từ khóa tìm kiếm (có thể để trống để lấy tất cả)" }
                  }
                }
              },
              {
                name: "get_weather",
                description: "Lấy thời tiết hiện tại của một thành phố.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    city: { type: "STRING", description: "Tên thành phố (VD: Hanoi, Ho Chi Minh)" }
                  },
                  required: ["city"]
                }
              },
              {
                name: "get_news",
                description: "Đọc tin tức mới nhất từ VNExpress.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "get_security_violations",
                description: "Lấy danh sách các vi phạm truy cập mạng (truy cập URL bị chặn) gần đây của nhân viên. Dành cho admin hoặc quản lý.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "get_my_events",
                description: "Lấy danh sách các cuộc họp, sự kiện hoặc lịch làm việc sắp tới của nhân viên đang chat.",
                parameters: { type: "OBJECT", properties: {} }
              }
            ]
          }
        ]
      }
    });

    let response = await chat.sendMessage({ message: userMessage });

    // Handle function calls loop
    while (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      console.log(`[AI] Calling function: ${call.name}`);

      let functionResult = {};

      if (call.name === 'get_leave_balance') {
        const leaves = await Leave.findAll({ where: { employeeId: userId, status: 'Approved' } });
        let usedDays = 0;
        leaves.forEach(l => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          const diffDays = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            usedDays += hours <= 4.5 ? 0.5 : 1;
          } else {
            usedDays += diffDays + 1;
          }
        });
        functionResult = { total_annual_leave: 12, used_leave: usedDays, remaining_leave: 12 - usedDays };
      } else if (call.name === 'get_leave_requests') {
        const userLeaves = await Leave.findAll({ where: { employeeId: userId }, order: [['createdAt', 'DESC']], limit: 5 });
        functionResult = userLeaves.length === 0 ? { message: "Bạn chưa có đơn nghỉ phép nào." } : { leaves: userLeaves.map(l => ({ id: l.id, leaveType: l.leaveType, startDate: l.startDate, endDate: l.endDate, reason: l.reason, status: l.status, createdAt: l.createdAt })) };
      } else if (call.name === 'get_salary') {
        const month = call.args.month;
        const year = call.args.year || new Date().getFullYear();
        const payroll = await Payroll.findOne({ where: { employeeId: userId, periodMonth: month, periodYear: year } });
        functionResult = payroll ? { month, year, baseSalary: payroll.baseSalary, allowance: payroll.allowance, deductions: payroll.deductions, netSalary: payroll.netSalary, status: payroll.status } : { error: `Không tìm thấy dữ liệu lương tháng ${month}/${year}` };
      } else if (call.name === 'create_leave_request') {
        const { leaveType, startDate, endDate, reason } = call.args;
        try {
          const newLeave = await Leave.create({ employeeId: userId, leaveType, startDate, endDate, reason, status: 'Pending' });
          functionResult = { success: true, message: "Đơn nghỉ phép đã được tạo thành công.", leave_id: newLeave.id };
        } catch (err) {
          functionResult = { error: "Không thể lưu đơn nghỉ phép." };
        }
      } else if (call.name === 'get_attendance_today') {
        const today = new Date().toISOString().split('T')[0];
        const att = await Attendance.findOne({ where: { employeeId: userId, date: today } });
        functionResult = att ? { status: att.status, checkIn: att.checkInTime, checkOut: att.checkOutTime } : { error: "Bạn chưa chấm công hôm nay." };
      } else if (call.name === 'get_attendance_late_this_month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const lateCount = await Attendance.count({ where: { employeeId: userId, date: { [Op.between]: [startOfMonth, endOfMonth] }, status: 'Late' } });
        functionResult = { late_count: lateCount, month: now.getMonth() + 1 };
      } else if (call.name === 'check_missing_punch') {
        const att = await Attendance.findOne({ where: { employeeId: userId, date: call.args.date } });
        functionResult = att ? { status: att.status, checkIn: att.checkInTime, checkOut: att.checkOutTime } : { error: `Không có dữ liệu chấm công ngày ${call.args.date}` };
      } else if (call.name === 'create_attendance_explanation') {
        try {
          const exp = await AttendanceExplanation.create({ employeeId: userId, type: call.args.type, date: call.args.date, reason: call.args.reason, status: 'Pending' });
          functionResult = { success: true, explanation_id: exp.id };
        } catch (err) {
          functionResult = { error: "Lỗi tạo đơn giải trình." };
        }
      } else if (call.name === 'manager_get_leave_today') {
        if (!isManager) {
          functionResult = { error: "Bạn không có quyền truy cập chức năng này." };
        } else {
          const today = new Date().toISOString().split('T')[0];
          const leaves = await Leave.findAll({
            where: { status: 'Approved', startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } },
            include: [{ model: Employee, as: 'employee', attributes: ['fullName', 'department'] }]
          });
          functionResult = { count: leaves.length, employees: leaves.map(l => ({ name: l.employee.fullName, department: l.employee.department, reason: l.reason })) };
        }
      } else if (call.name === 'manager_get_late_this_week') {
        if (!isManager) {
          functionResult = { error: "Bạn không có quyền truy cập chức năng này." };
        } else {
          const now = new Date();
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)).toISOString().split('T')[0];
          const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7)).toISOString().split('T')[0];
          const lates = await Attendance.findAll({
            where: { date: { [Op.between]: [startOfWeek, endOfWeek] }, status: 'Late' },
            include: [{ model: Employee, as: 'employee', attributes: ['fullName', 'department'] }]
          });
          functionResult = { count: lates.length, records: lates.map(l => ({ name: l.employee.fullName, date: l.date, checkIn: l.checkInTime })) };
        }
      } else if (call.name === 'manager_get_total_payroll') {
        if (!isAdmin) {
          functionResult = { error: "Bạn không có quyền truy cập chức năng này." };
        } else {
          const payrolls = await Payroll.findAll({ where: { periodMonth: call.args.month, periodYear: call.args.year } });
          const total = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
          functionResult = { month: call.args.month, year: call.args.year, total_payroll: total };
        }
      } else if (call.name === 'schedule_email') {
        try {
          const [timePart, datePart] = call.args.timeStr.split(' ');
          const [hours, minutes] = timePart.split(':');
          const [day, month, year] = datePart.split('/');
          const scheduledAt = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);
          if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
             functionResult = { error: "Thời gian không hợp lệ hoặc nằm trong quá khứ." };
          } else {
            let finalRecipients = call.args.to;
            if (call.args.to === 'ALL') {
              const allEmps = await Employee.findAll({ where: { isDeleted: false }, attributes: ['email'] });
              finalRecipients = allEmps.map(e => e.email).filter(Boolean).join(', ');
            } else if (call.args.to.startsWith('DEPT:')) {
              const deptName = call.args.to.substring(5);
              const deptEmps = await Employee.findAll({ where: { department: deptName, isDeleted: false }, attributes: ['email'] });
              finalRecipients = deptEmps.map(e => e.email).filter(Boolean).join(', ');
            }
            if (!finalRecipients) {
               functionResult = { error: `Không tìm thấy email hợp lệ cho ${call.args.to}` };
            } else {
              await ScheduledEvent.create({
                creatorId: userId,
                title: `AI lên lịch: ${call.args.subject}`,
                type: 'EMAIL',
                scheduledAt: scheduledAt,
                status: 'PENDING',
                payload: { to: finalRecipients, subject: call.args.subject, body: call.args.body, attachments: [] }
              });
              functionResult = { success: true, message: "Đã lên lịch gửi mail thành công." };
            }
          }
        } catch (err) {
          functionResult = { error: "Lỗi hệ thống khi tạo lịch." };
        }
      } else if (call.name === 'schedule_meeting') {
        try {
          const [timePart, datePart] = call.args.timeStr.split(' ');
          const [hours, minutes] = timePart.split(':');
          const [day, month, year] = datePart.split('/');
          const scheduledAt = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);
          if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
             functionResult = { error: "Thời gian không hợp lệ hoặc nằm trong quá khứ." };
          } else {
            let finalRecipients = call.args.participants;
            if (call.args.participants === 'ALL') {
              const allEmps = await Employee.findAll({ where: { isDeleted: false }, attributes: ['email'] });
              finalRecipients = allEmps.map(e => e.email).filter(Boolean).join(', ');
            } else if (call.args.participants.startsWith('DEPT:')) {
              const deptName = call.args.participants.substring(5);
              const deptEmps = await Employee.findAll({ where: { department: deptName, isDeleted: false }, attributes: ['email'] });
              finalRecipients = deptEmps.map(e => e.email).filter(Boolean).join(', ');
            }
            if (!finalRecipients) {
               functionResult = { error: `Không tìm thấy email hợp lệ cho ${call.args.participants}` };
            } else {
              let meetLink = call.args.location;
              if (!meetLink) {
                try {
                  const googleCalendarController = require('./googleCalendarController');
                  const { google } = require('googleapis');
                  const authClient = await googleCalendarController.getAuthenticatedClient(userId);
                  if (authClient) {
                    const calendar = google.calendar({ version: 'v3', auth: authClient });
                    const resGcal = await calendar.events.insert({
                      calendarId: 'primary',
                      resource: {
                        summary: `Họp: ${call.args.title}`,
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
                } catch (googleErr) {
                  console.error('Lỗi tạo Google Meet từ AI:', googleErr);
                }
              }
              
              if (!meetLink) {
                meetLink = `https://meet.jit.si/HRMS_Meeting_${Math.random().toString(36).substring(2, 12)}`;
              }

              await ScheduledEvent.create({
                creatorId: userId,
                title: `Họp: ${call.args.title}`,
                type: 'MEETING',
                scheduledAt: scheduledAt,
                status: 'PENDING',
                meetLink: meetLink,
                payload: { 
                  to: finalRecipients, 
                  subject: `Mời họp: ${call.args.title}`, 
                  body: `Bạn được mời tham gia cuộc họp: ${call.args.title}\nThời gian: ${call.args.timeStr}\nLink họp: ${meetLink}`,
                  participants: finalRecipients, 
                  title: call.args.title, 
                  location: meetLink, 
                  attachments: [] 
                }
              });
              functionResult = { success: true, message: "Đã lên lịch họp thành công." };
            }
          }
        } catch (err) {
          functionResult = { error: "Lỗi hệ thống khi tạo lịch họp." };
        }
      } else if (call.name === 'search_policies') {
        try {
          const keyword = call.args.keyword || '';
          const whereCondition = { status: 'PUBLISHED' };
          if (keyword) {
            whereCondition.title = { [Op.like]: `%${keyword}%` };
          }
          const policies = await PolicyDocument.findAll({
            where: whereCondition,
            attributes: ['id', 'title', 'category', 'description'],
            limit: 10
          });
          functionResult = policies.length > 0 
            ? { count: policies.length, policies: policies.map(p => ({ id: p.id, title: p.title, category: p.category, description: p.description })) }
            : { message: "Không tìm thấy tài liệu nào khớp với từ khóa." };
        } catch (err) {
          functionResult = { error: "Lỗi hệ thống khi tìm tài liệu." };
        }
      } else if (call.name === 'get_security_violations') {
        try {
          if (!isAdmin) {
            functionResult = { error: "Chỉ Admin mới có quyền xem dữ liệu bảo mật." };
          } else {
            const { WebAccessLog } = require('../models');
            const violations = await WebAccessLog.findAll({
              where: { action: 'blocked' },
              include: [{ model: Employee, as: 'employee', attributes: ['fullName', 'email'] }],
              order: [['timestamp', 'DESC']],
              limit: 20
            });
            functionResult = violations.length > 0 
              ? { count: violations.length, violations: violations.map(v => ({ employee: v.employee?.fullName, url: v.url, time: v.timestamp })) }
              : { message: "Không có vi phạm truy cập nào gần đây." };
          }
        } catch (err) {
          console.error(err);
          functionResult = { error: "Lỗi khi lấy dữ liệu bảo mật." };
        }
      } else if (call.name === 'get_my_events') {
        try {
          const emp = await Employee.findByPk(userId, { attributes: ['email'] });
          const userEmail = emp ? emp.email : null;

          const userConditions = [ { creatorId: userId } ];
          if (userEmail) {
            userConditions.push({ payload: { [Op.like]: `%${userEmail}%` } });
          }

          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const events = await ScheduledEvent.findAll({
            where: {
              [Op.or]: userConditions,
              scheduledAt: {
                [Op.gte]: startOfToday // Lấy sự kiện từ đầu ngày hôm nay trở đi
              }
            },
            order: [['scheduledAt', 'ASC']],
            limit: 10
          });
          const now = new Date();
          functionResult = events.length > 0 
            ? { 
                count: events.length, 
                events: events.map(e => ({ 
                  title: e.title, 
                  type: e.type, 
                  scheduledAt: e.scheduledAt, 
                  status: e.status,
                  timeStatus: new Date(e.scheduledAt) < now ? "Đã diễn ra" : "Sắp tới"
                })) 
              }
            : { message: "Bạn không có cuộc họp hay sự kiện nào trong hôm nay và sắp tới." };
        } catch (err) {
          console.error(err);
          functionResult = { error: "Lỗi khi lấy danh sách sự kiện." };
        }
      } else if (call.name === 'get_weather') {
        functionResult = await getWeather(call.args.city);
      } else if (call.name === 'get_news') {
        functionResult = await getNews();
      }

      // Đảm bảo functionResult luôn là một Object (Struct) - không phải Array
      const safeResponse = (typeof functionResult === 'object' && functionResult !== null && !Array.isArray(functionResult)) 
        ? functionResult 
        : { result: functionResult };

      // Send the function response back to the model - đúng cú pháp SDK @google/genai
      response = await chat.sendMessage({
        message: [{
          functionResponse: {
            name: call.name,
            response: safeResponse
          }
        }]
      });
    }

    return response.text;
  } catch (error) {
    console.error("[AI Service Error]:", error);
    if (error.status === 429) {
      let delay = 60;
      const match = error.message && error.message.match(/retry in ([\d\.]+)s/);
      if (match && match[1]) {
        delay = Math.ceil(parseFloat(match[1]));
      }
      throw new Error(`RATE_LIMIT:${delay}`);
    }
    return "Xin lỗi, đã xảy ra lỗi trong lúc phân tích dữ liệu.";
  }
}

// Ham nay dung de phan tich doan van ban giong noi va boc tach y dinh sang JSON tao don xin nghi phep tu dong
async function parseVoiceToForm(text) {
  if (!ai) return { error: "AI chưa được cấu hình" };

  try {
    const prompt = `Bạn là trợ lý AI phân tích ý định (Intent Parser) cho hệ thống nhân sự.
Người dùng nói: "${text}"

Nhiệm vụ của bạn:
1. Phân tích xem người dùng muốn làm gì. Nếu muốn xin nghỉ phép (leave_request), hãy trích xuất loại nghỉ phép (mặc định luôn là Annual), ngày bắt đầu (startDate), ngày kết thúc (endDate) dưới định dạng ISO 8601 (YYYY-MM-DDTHH:mm:00), và lý do (reason).
Lưu ý quan trọng về thời gian (tính từ thời điểm hiện tại: ${new Date().toISOString()}):
- Nếu nói "sáng" (ví dụ: sáng mai, sáng ngày kia): Giờ bắt đầu 08:00:00, Giờ kết thúc 12:00:00 (Tính là nửa ca).
- Nếu nói "chiều" (ví dụ: chiều mai, chiều hôm nay): Giờ bắt đầu 13:00:00, Giờ kết thúc 17:00:00 (Tính là nửa ca).
- Nếu nói "cả ngày" hoặc không nói rõ buổi (ví dụ: ngày mai, ngày kia): Giờ bắt đầu 08:00:00, Giờ kết thúc 17:00:00 (Tính là full ca).
- Nhớ tính toán ngày chính xác: "ngày mai" = ngày hiện tại + 1, "ngày kia" = ngày hiện tại + 2.
2. Trả về DUY NHẤT một chuỗi JSON chuẩn (không có markdown \`\`\`json), với cấu trúc:
{
  "intent": "leave_request", // hoặc "unknown" nếu không hiểu
  "leaveType": "Annual", // Luôn luôn là "Annual" (Nghỉ phép)
  "startDate": "2026-07-07T08:00:00",
  "endDate": "2026-07-07T12:00:00",
  "reason": "lý do trích xuất được"
}`;

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
    });
    
    const resultText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(resultText);
  } catch (error) {
    console.error("[AI Voice Parser Error]:", error);
    if (error.status === 429) {
      let delay = 60;
      const match = error.message && error.message.match(/retry in ([\d\.]+)s/);
      if (match && match[1]) {
        delay = Math.ceil(parseFloat(match[1]));
      }
      throw new Error(`RATE_LIMIT:${delay}`);
    }
    return { error: "Lỗi phân tích giọng nói" };
  }
}

// Ham nay dung de phan tich doan tin nhan/email de phat hien lua dao, danh gia muc do rui ro va dua ra canh bao
async function detectScamText(text) {
  if (!ai) return { error: "AI chưa được cấu hình" };
  const prompt = `Bạn là chuyên gia phân tích bảo mật. Phân tích đoạn văn bản sau và cho biết:
1. Mức độ rủi ro lừa đảo: THẤP / TRUNG BÌNH / CAO / RẤT CAO
2. Loại lừa đảo (nếu có): giả mạo ngân hàng, chiếm đoạt tài khoản, trúng thưởng, giả cơ quan nhà nước, v.v.
3. Các dấu hiệu nghi vấn cụ thể
4. Gợi ý hành động cho người dùng

Văn bản cần phân tích:
"""${text}"""

Trả về JSON với format DUY NHẤT:
{
  "riskLevel": "THẤP|TRUNG BÌNH|CAO|RẤT CAO",
  "scamType": "...",
  "redFlags": ["...", "..."],
  "recommendation": "...",
  "confidence": 0-100
}`;

  try {
    const result = await ai.models.generateContent({
      model: AI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(result.text);
  } catch (error) {
    console.error("[AI Scam Detection Error]:", error);
    return { error: "Lỗi khi phân tích lừa đảo" };
  }
}

// Ham nay dung de nhan dien giay to tuy than (CCCD, Ho chieu) qua anh base64 bang Vision AI va phat hien gia mao
async function analyzeDocument(imageBase64, mimeType = 'image/jpeg') {
  if (!ai) return { error: "AI chưa được cấu hình" };
  
  // Extract base64 without data URL prefix if present
  let base64Data = imageBase64;
  if (imageBase64.includes('base64,')) {
    base64Data = imageBase64.split('base64,')[1];
  }

  const prompt = `Phân tích giấy tờ trong ảnh và kiểm tra tính hợp lệ:
1. Loại giấy tờ (CCCD, hộ chiếu, hóa đơn, v.v.)
2. Trích xuất thông tin chính (số ID, tên, ngày sinh, ngày cấp...)
3. Dấu hiệu bất thường: font chữ không đồng nhất, logo mờ/bị chỉnh sửa, thông tin mâu thuẫn
4. Đánh giá tổng thể: HỢP LỆ / NGHI NGỜ / GIẢ MẠO

Trả về JSON với format DUY NHẤT:
{
  "documentType": "...",
  "extractedInfo": { "id": "...", "name": "...", "dob": "..." },
  "anomalies": ["...", "..."],
  "verdict": "HỢP LỆ|NGHI NGỜ|GIẢ MẠO",
  "confidence": 0-100,
  "notes": "..."
}`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      }],
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(result.text);
  } catch (error) {
    console.error("[AI Document Analysis Error]:", error);
    return { error: "Lỗi khi phân tích giấy tờ" };
  }
}

module.exports = { handleAIQuery, parseVoiceToForm, detectScamText, analyzeDocument };
