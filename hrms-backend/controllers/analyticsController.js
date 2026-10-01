const { Employee, Attendance, Payroll, Leave, SecurityViolation } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { GoogleGenAI } = require('@google/genai');

class AnalyticsController {
  /**
   * GET /api/analytics/overview
   * Trả về số liệu tổng quan: tổng NV, đi làm hôm nay, đi trễ, nghỉ phép
   */
  static async getOverview(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];

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

  /**
   * GET /api/analytics/attendance-trend?days=30
   * Xu hướng chấm công theo ngày (7 hoặc 30 ngày gần nhất)
   */
  static async getAttendanceTrend(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const results = [];

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.getDay();
        // Bỏ qua T7, CN
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateStr = d.toISOString().split('T')[0];
        const [present, late, absent] = await Promise.all([
          Attendance.count({ where: { date: dateStr, status: 'Present' } }),
          Attendance.count({ where: { date: dateStr, status: 'Late' } }),
          Attendance.count({ where: { date: dateStr, status: 'Absent' } }),
        ]);

        results.push({
          date: dateStr,
          label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          present,
          late,
          absent,
        });
      }

      res.json(results);
    } catch (error) {
      console.error('Attendance trend error:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  /**
   * GET /api/analytics/payroll-summary?year=2026
   * Tổng chi lương theo từng tháng trong năm
   */
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
          totalNet:    Math.round((totalNet / 1_000_000) * 10) / 10, // Đơn vị: triệu VNĐ (giữ 1 số thập phân)
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

  /**
   * GET /api/analytics/department-attendance
   * Tỷ lệ chấm công theo phòng ban (tháng hiện tại)
   */
  static async getDepartmentAttendance(req, res) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const employees = await Employee.findAll({
        where: { isDeleted: false, status: 'active' },
        attributes: ['id', 'department'],
      });

      // Group by department
      const deptMap = {};
      for (const emp of employees) {
        const dept = emp.department || 'Chưa phân';
        if (!deptMap[dept]) deptMap[dept] = { total: 0, present: 0 };
        deptMap[dept].total++;

        const count = await Attendance.count({
          where: {
            employeeId: emp.id,
            date: { [Op.between]: [startDate, endDate] },
            status: { [Op.in]: ['Present', 'Late', 'Half-day'] },
          },
        });
        deptMap[dept].present += count;
      }

      // Tính số ngày làm việc trong tháng
      let workingDays = 0;
      for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      }

      const result = Object.entries(deptMap).map(([dept, v]) => ({
        department: dept,
        rate: workingDays > 0 && v.total > 0
          ? Math.round((v.present / (v.total * workingDays)) * 100)
          : 0,
        headcount: v.total,
      }));

      res.json(result);
    } catch (error) {
      console.error('Department attendance error:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  /**
   * GET /api/analytics/leave-stats
   * Phân bố trạng thái nghỉ phép
   */
  static async getLeaveStats(req, res) {
    try {
      const year = new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate   = `${year}-12-31`;

      const [approved, pending, rejected] = await Promise.all([
        Leave.count({ where: { status: 'Approved',  startDate: { [Op.gte]: startDate }, endDate: { [Op.lte]: endDate } } }),
        Leave.count({ where: { status: 'Pending',   startDate: { [Op.gte]: startDate }, endDate: { [Op.lte]: endDate } } }),
        Leave.count({ where: { status: 'Rejected',  startDate: { [Op.gte]: startDate }, endDate: { [Op.lte]: endDate } } }),
      ]);

      res.json([
        { name: 'Đã duyệt',     value: approved, color: '#10b981' },
        { name: 'Chờ duyệt',    value: pending,  color: '#f59e0b' },
        { name: 'Từ chối',      value: rejected, color: '#ef4444' },
      ]);
    } catch (error) {
      console.error('Leave stats error:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  /**
   * GET /api/analytics/ai-insights
   * Gửi dữ liệu thống kê cho Gemini AI để lấy nhận xét và hành động đề xuất
   */
  static async getAIInsights(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

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

      let jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResult = JSON.parse(jsonStr);

      res.json(aiResult);
    } catch (error) {
      console.error('AI Insights error:', error);
      res.status(500).json({ message: 'Lỗi server khi phân tích AI', error: error.message });
    }
  }
}

module.exports = AnalyticsController;
