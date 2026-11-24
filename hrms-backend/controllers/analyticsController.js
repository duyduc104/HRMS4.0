const { Employee, Attendance, Payroll, Leave, SecurityViolation } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { GoogleGenAI } = require('@google/genai');

// Helper lay chuoi ngay YYYY-MM-DD chuan theo mui gio Viet Nam (Asia/Ho_Chi_Minh - UTC+7)
// Giai quyet triet de loi toISOString() quy doi ve UTC khien dateStr bi lui 1 ngay truoc 07:00 sang
function getVietnamDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

// Controller phan tich du lieu va thong ke bao cao toan he thong HRMS
class AnalyticsController {
  // Ham nay dung de lay so lieu tong quan: tong nhan vien, so nguoi di lam hom nay, di tre, nghi phep va ty le cham cong
  static async getOverview(req, res) {
    try {
      const today = getVietnamDate();

      const [totalEmployees, presentToday, lateToday, onLeaveToday] = await Promise.all([
        Employee.count({ where: { isDeleted: false, status: 'active' } }),
        Attendance.count({ where: { date: today, status: { [Op.in]: ['Present', 'Late', 'Half-day'] } } }),
        Attendance.count({ where: { date: today, status: 'Late' } }),
        Leave.count({
          where: {
            status: 'Approved',
            startDate: { [Op.lte]: today },
            endDate: { [Op.gte]: today }
          }
        }),
      ]);

      const absentToday = totalEmployees - presentToday - onLeaveToday;

      res.json({
        totalEmployees,
        presentToday,
        lateToday,
        onLeaveToday,
        absentToday: absentToday > 0 ? absentToday : 0,
        attendanceRate: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0,
      });
    } catch (error) {
      console.error('Analytics overview error:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de lay xu huong cham cong theo ngay (7 hoac 30 ngay gan nhat, bo qua thu 7 va chu nhat)
  static async getAttendanceTrend(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const now = new Date();
      const workingDates = [];

      // Xac dinh danh sach ngay lam viec (tru T7, CN) theo mui gio Viet Nam
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = getVietnamDate(d);

        // Xac dinh thu trong tuan theo gio Viet Nam (tranh lech ngay do gio he thong)
        const [y, m, dayNum] = dateStr.split('-').map(Number);
        const vnDateObj = new Date(y, m - 1, dayNum);
        const dayOfWeek = vnDateObj.getDay();

        // Bo qua Thu 7 (6) va Chu Nhat (0)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const label = `${String(dayNum).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
        workingDates.push({ dateStr, label });
      }

      if (workingDates.length === 0) {
        return res.json([]);
      }

      const minDate = workingDates[0].dateStr;
      const maxDate = workingDates[workingDates.length - 1].dateStr;

      // 1 Query duy nhat tong hop toan bo so lieu cham cong trong dai ngay lam viec
      const attendanceCounts = await Attendance.findAll({
        where: {
          date: { [Op.between]: [minDate, maxDate] },
          status: { [Op.in]: ['Present', 'Late', 'Absent', 'Half-day'] }
        },
        attributes: [
          'date',
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['date', 'status'],
        raw: true
      });

      // Map du lieu: dateStr -> { Present, Late, Absent }
      const countMap = {};
      attendanceCounts.forEach(item => {
        const d = String(item.date).substring(0, 10);
        if (!countMap[d]) {
          countMap[d] = { Present: 0, Late: 0, Absent: 0 };
        }
        const cnt = parseInt(item.count, 10) || 0;
        if (item.status === 'Present' || item.status === 'Half-day') {
          countMap[d].Present += cnt;
        } else if (item.status === 'Late') {
          countMap[d].Late += cnt;
        } else if (item.status === 'Absent') {
          countMap[d].Absent += cnt;
        }
      });

      // Map vao mang workingDates theo dung thu tu thoi gian
      const results = workingDates.map(({ dateStr, label }) => {
        const dayCounts = countMap[dateStr] || { Present: 0, Late: 0, Absent: 0 };
        return {
          date: dateStr,
          label,
          present: dayCounts.Present,
          late: dayCounts.Late,
          absent: dayCounts.Absent
        };
      });

      res.json(results);
    } catch (error) {
      console.error('Attendance trend error:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de tinh tong chi phi luong, lam them gio OT va khau tru theo tung thang trong nam
  static async getPayrollSummary(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const months = [];

      for (let m = 1; m <= 12; m++) {
        const payrolls = await Payroll.findAll({
          where: { periodYear: year, periodMonth: m },
          attributes: ['netSalary', 'overtimePay', 'deductions', 'baseSalary'],
        });

        const totalNet    = payrolls.reduce((s, p) => s + parseFloat(p.netSalary > 0 ? p.netSalary : (p.baseSalary || 0)), 0);
        const totalOT     = payrolls.reduce((s, p) => s + parseFloat(p.overtimePay || 0), 0);
        const totalDeduct = payrolls.reduce((s, p) => s + parseFloat(p.deductions  || 0), 0);

        months.push({
          month: m,
          label: `T${m}`,
          totalNet:    Math.round((totalNet / 1_000_000) * 10) / 10, // Don vi: trieu VND
          totalOT:     Math.round((totalOT / 1_000_000) * 10) / 10,
          totalDeduct: Math.round((totalDeduct / 1_000_000) * 10) / 10,
          headcount: payrolls.length,
        });
      }

      res.json(months);
    } catch (error) {
      console.error('Payroll summary error:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de tinh ty le di lam cham cong theo tung phong ban trong thang hien tai
  // TOI UU: Loai bo N+1 query loop, tinh toan theo mui gio Viet Nam
  static async getDepartmentAttendance(req, res) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startDate = getVietnamDate(new Date(currentYear, currentMonth, 1));
      const endDate   = getVietnamDate(new Date(currentYear, currentMonth + 1, 0));

      const employees = await Employee.findAll({
        where: { isDeleted: false, status: 'active' },
        attributes: ['id', 'department'],
      });

      // Group by department
      const deptMap = {};
      const empIdToDept = {};
      for (const emp of employees) {
        const dept = emp.department || 'Chưa phân';
        if (!deptMap[dept]) deptMap[dept] = { total: 0, present: 0 };
        deptMap[dept].total++;
        empIdToDept[emp.id] = dept;
      }

      // 1 Query duy nhat lay so ngay di lam cua tat ca nhan vien
      const empIds = employees.map(e => e.id);
      if (empIds.length > 0) {
        const attendanceCounts = await Attendance.findAll({
          where: {
            employeeId: { [Op.in]: empIds },
            date: { [Op.between]: [startDate, endDate] },
            status: { [Op.in]: ['Present', 'Late', 'Half-day'] },
          },
          attributes: [
            'employeeId',
            [fn('COUNT', col('id')), 'count']
          ],
          group: ['employeeId'],
          raw: true
        });

        attendanceCounts.forEach(record => {
          const dept = empIdToDept[record.employeeId];
          if (dept && deptMap[dept]) {
            deptMap[dept].present += parseInt(record.count, 10) || 0;
          }
        });
      }

      // Tính số ngày làm việc trong tháng (tru T7, CN)
      let workingDays = 0;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(currentYear, currentMonth, day);
        if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      }

      const results = Object.entries(deptMap).map(([name, data]) => {
        const expectedTotal = data.total * workingDays;
        const rate = expectedTotal > 0 ? Math.round((data.present / expectedTotal) * 100) : 0;
        return {
          department: name,
          totalEmployees: data.total,
          presentDays: data.present,
          rate: Math.min(100, rate),
        };
      });

      res.json(results);
    } catch (error) {
      console.error('Department attendance error:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de goi Google Gemini AI dua ra nhan xet thong minh ve tinh hinh nhan su va de xuat hanh dong
  static async getAIInsights(req, res) {
    try {
      const today = getVietnamDate();
      const now = new Date();
      const startOfMonth = getVietnamDate(new Date(now.getFullYear(), now.getMonth(), 1));

      // Lấy dữ liệu thô
      const totalEmployees = await Employee.count({ where: { isDeleted: false, status: 'active' } });
      const lateTodayRecords = await Attendance.findAll({
        where: { date: today, status: 'Late' },
        include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'email', 'department'] }]
      });
      const pendingViolations = await SecurityViolation.findAll({
        where: { status: { [Op.in]: ['Pending', 'Submitted'] } },
        include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'email', 'department'] }]
      });

      // Nhóm đi muộn theo phòng ban
      const deptLate = {};
      for (const r of lateTodayRecords) {
        if (!r.employee) continue;
        const d = r.employee.department || 'Chưa phân';
        deptLate[d] = (deptLate[d] || 0) + 1;
      }

      // Xây dựng nội dung cho AI
      let promptData = `Dữ liệu hệ thống HRMS hôm nay (${today}):\n`;
      promptData += `- Tổng nhân sự: ${totalEmployees}\n`;
      promptData += `- Tổng số người đi muộn hôm nay: ${lateTodayRecords.length}\n`;
      if (lateTodayRecords.length > 0) {
        promptData += `- Các phòng ban có người đi muộn hôm nay: ${JSON.stringify(deptLate)}\n`;
        promptData += `- Danh sách chi tiết người đi muộn hôm nay: ${lateTodayRecords.map(r => r.employee.fullName + ' (' + r.employee.email + ')').join(', ')}\n`;
      }
      
      promptData += `- Tổng số vi phạm bảo mật đang chờ xử lý (Pending/Submitted): ${pendingViolations.length}\n`;
      if (pendingViolations.length > 0) {
        promptData += `- Danh sách người vi phạm bảo mật: ${pendingViolations.map(v => v.employee.fullName + ' (' + v.employee.email + ') - ' + v.blockedCount + ' lần chặn').join(', ')}\n`;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'Chưa cấu hình GEMINI_API_KEY' });

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Bạn là Giám đốc Nhân sự ảo của hệ thống HRMS. Dựa trên dữ liệu dưới đây, hãy đưa ra phân tích sắc bén và đề xuất hành động.
${promptData}

Yêu cầu trả về DUY NHẤT 1 chuỗi JSON (KHÔNG bọc trong \`\`\`json) với định dạng chính xác sau:
{
  "insights": [
    "Nhận xét 1 (ví dụ: Phòng IT đi muộn quá nhiều)",
    "Nhận xét 2 (ví dụ: Có 2 nhân viên vi phạm bảo mật nặng)"
  ],
  "suggestedActions": [
    {
      "action": "schedule_meeting",
      "target": "email1@example.com, email2@example.com",
      "label": "Tạo lịch họp khẩn với Nguyễn Văn A",
      "prefill": { "title": "Họp cảnh cáo đi muộn", "body": "Yêu cầu bạn tham gia họp để giải trình vấn đề đi muộn." }
    },
    {
      "action": "schedule_email",
      "target": "DEPT:IT",
      "label": "Gửi email nhắc nhở toàn phòng IT",
      "prefill": { "title": "Nhắc nhở nội quy", "body": "Mong các bạn chú ý giờ giấc đi làm." }
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }

      let aiResult;
      try {
        aiResult = JSON.parse(jsonStr);
      } catch (pErr) {
        aiResult = {
          insights: [
            `Tổng nhân sự: ${totalEmployees}`,
            lateTodayRecords.length > 0 ? `Có ${lateTodayRecords.length} nhân sự đi muộn hôm nay.` : 'Hôm nay toàn thể nhân sự đúng giờ.',
            pendingViolations.length > 0 ? `Có ${pendingViolations.length} vi phạm bảo mật đang chờ duyệt.` : 'Không có vi phạm bảo mật nào tồn đọng.'
          ],
          suggestedActions: []
        };
      }

      res.json(aiResult);
    } catch (error) {
      console.error('AI Insights error:', error);
      res.status(500).json({ message: 'Lỗi server khi phân tích AI', error: error.message });
    }
  }
}

module.exports = AnalyticsController;
