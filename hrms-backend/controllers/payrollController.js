const { Payroll, Employee, Attendance, Leave, Salary } = require('../models');
const { Op } = require('sequelize');
const { calculateLeaveDays } = require('../utils/leaveUtils');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');

class PayrollController {
  // Ham nay dung de nhan vien xem toan bo lich su bang luong ca nhan cua minh qua cac thang/nam (Ho tro phan trang)
  // GET /api/payroll/me
  static async getMyPayrolls(req, res) {
    try {
      const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
      const queryOptions = {
        where: { employeeId: req.user.id },
        include: [{ 
          model: Employee, 
          as: 'employee', 
          attributes: ['id', 'fullName', 'code', 'department'],
          include: [
            { model: Salary, as: 'salaryInfo', attributes: ['bankAccount', 'bankName'] },
            { model: require('../models').OnboardingRecord, as: 'onboarding', attributes: ['bankAccountNumber', 'bankName'] }
          ]
        }],
        order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']]
      };

      if (isPaginated) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
        const { count, rows } = await Payroll.findAndCountAll(queryOptions);
        return formatPaginatedResponse(res, count, rows, page, limit);
      }

      const payrolls = await Payroll.findAll(queryOptions);
      res.json(payrolls);
    } catch (error) {
      console.error('Error fetching my payrolls:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung cho Ke toan hoac Admin xem toan bo bang luong cua tat ca nhan vien theo thang/nam (Ho tro phan trang)
  // GET /api/payroll
  static async getAllPayrolls(req, res) {
    try {
      const { month, year } = req.query;
      const where = {};
      if (month) where.periodMonth = month;
      if (year) where.periodYear = year;

      const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
      const queryOptions = {
        where,
        include: [{ 
          model: Employee, 
          as: 'employee', 
          attributes: ['id', 'fullName', 'code', 'department'],
          where: { isDeleted: false },
          include: [
            { model: Salary, as: 'salaryInfo', attributes: ['bankAccount', 'bankName'] },
            { model: require('../models').OnboardingRecord, as: 'onboarding', attributes: ['bankAccountNumber', 'bankName'] }
          ]
        }],
        order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']]
      };

      if (isPaginated) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
        const { count, rows } = await Payroll.findAndCountAll(queryOptions);
        return formatPaginatedResponse(res, count, rows, page, limit);
      }

      const payrolls = await Payroll.findAll(queryOptions);
      res.json(payrolls);
    } catch (error) {
      console.error('Error fetching all payrolls:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de tinh toan tu dong bang luong cho nhan vien trong mot ky thang/nam
  // Giai thich code khong thuan:
  // - Tinh so ngay lam viec tieu chuan trong thang (tru thu 7, chu nhat) de ra don gia theo gio (dynamicHourlyRate)
  // - Tinh gio cong thuc te: Tu dong tru 1 tieng nghi trua neu lam qua 12h-13h
  // - Phan loai ca: Ngay thu 7 sang tinh gio thuong (max 4h), chieu tinh OT. Chu nhat tinh 100% OT (nhan he so otMultiplier 1.5)
  // - Tinh tien phat di muon (50k/lan), bao hiem (10.5% luong co ban), thue TNCN (5%)
  // - Tong hop so tien da tam ung trong thang (AdvanceRequest) va tu dong giam tru vao luong thuc linh (netSalary)
  // POST /api/payroll/calculate
  static async calculatePayroll(req, res) {
    try {
      const { month, year, employeeIds } = req.body;
      if (!month || !year) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tháng và năm' });
      }

      const whereClause = { status: 'active', isDeleted: false };
      if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
        whereClause.id = { [Op.in]: employeeIds };
      }

      // Lấy nhân viên kèm theo thông tin Lương cơ bản
      const employees = await Employee.findAll({
        where: whereClause,
        include: [{ model: Salary, as: 'salaryInfo' }]
      });

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month

      // Số ngày làm việc tiêu chuẩn trong tháng (giả sử trừ T7, CN)
      let standardWorkingDays = 0;
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) standardWorkingDays++;
      }

      const results = [];

      for (const emp of employees) {
        // Lấy chấm công trong tháng
        const attendances = await Attendance.findAll({
          where: {
            employeeId: emp.id,
            date: {
              [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
            },
            status: {
              [Op.in]: ['Present', 'Late', 'Half-day'] // Lấy các ngày có đi làm
            }
          }
        });

        // Lấy số ngày nghỉ được duyệt
        const leaves = await Leave.findAll({
          where: {
            employeeId: emp.id,
            status: 'Approved',
            startDate: { [Op.lte]: endDate.toISOString().split('T')[0] },
            endDate: { [Op.gte]: startDate.toISOString().split('T')[0] }
          }
        });

        // ✅ BUG 2 FIX: Dùng hàm chung calculateLeaveDays() — loại trừ T7, CN
        const approvedLeaveDays = calculateLeaveDays(leaves, startDate, endDate);

        const salaryInfo = emp.salaryInfo || { baseSalary: 15000000, allowance: 0, otMultiplier: 1.5 };
        const otMultiplier = parseFloat(salaryInfo.otMultiplier || 1.5);
        
        const validStandardDays = standardWorkingDays > 0 ? standardWorkingDays : 22;
        const dailyRate = salaryInfo.baseSalary / validStandardDays;
        const dynamicHourlyRate = dailyRate / 8;
        
        let totalRegularHours = 0;
        let totalWeekdayOvertimeHours = 0;
        let totalWeekendOvertimeHours = 0;
        let lateCount = 0;

        attendances.forEach(att => {
          if (att.status === 'Late') lateCount++;

          if (att.checkInTime && att.checkOutTime) {
            const checkIn = new Date(att.checkInTime);
            const checkOut = new Date(att.checkOutTime);
            let hours = (checkOut - checkIn) / (1000 * 60 * 60);

            const noonStart = new Date(att.date + 'T12:00:00');
            const noonEnd = new Date(att.date + 'T13:00:00');
            if (checkIn <= noonStart && checkOut >= noonEnd) {
               hours -= 1; 
            }
            if (hours <= 0) return;

            const attendanceDateObj = new Date(att.date);
            const attendanceDay = attendanceDateObj.getDay(); 

            // CHUAN BLLD 2019 (Dieu 98):
            // - Chu nhat (Ngay nghi hang tuan): He so it nhat 200% (2.0x)
            // - Ngay thu 7: Sang lam gio thuong (max 4h), chieu tinh lam them gio nghi (2.0x)
            // - Ngay thuong: Tren 8h tinh lam them ngay thuong (1.5x)
            if (attendanceDay === 0) { // Chủ nhật -> 200%
              totalWeekendOvertimeHours += hours;
            } else if (attendanceDay === 6) { // Thứ 7
              let morningHours = 0;
              let afternoonHours = 0;

              if (checkOut <= noonStart) {
                morningHours = hours;
              } else if (checkIn >= noonEnd) {
                afternoonHours = hours;
              } else {
                morningHours = (noonStart - checkIn) / (1000 * 60 * 60);
                afternoonHours = (checkOut - noonEnd) / (1000 * 60 * 60);
              }

              totalRegularHours += Math.min(morningHours, 4);
              totalWeekendOvertimeHours += Math.max(0, afternoonHours);
            } else { // Ngày thường
              totalRegularHours += Math.min(hours, 8);
              if (hours > 8) {
                totalWeekdayOvertimeHours += (hours - 8);
              }
            }
          }
        });

        const leaveHours = approvedLeaveDays * 8;
        
        // Tinh tien OT theo chuan Dieu 98 Bo Luat Lao Dong 2019
        const weekdayOtRate = dynamicHourlyRate * Math.max(1.5, otMultiplier);
        const weekendOtRate = dynamicHourlyRate * 2.0; // Chu nhat he so 2.0
        const overtimePay = (totalWeekdayOvertimeHours * weekdayOtRate) + (totalWeekendOvertimeHours * weekendOtRate);

        const grossSalary = (totalRegularHours + leaveHours) * dynamicHourlyRate + overtimePay;
        const allowance = parseFloat(salaryInfo.allowance || 0);
        const deductions = lateCount * 50000;
        
        // Bao hiem xa hoi bat buoc: 10.5% luong co ban (8% BHXH + 1.5% BHYT + 1% BHTN)
        const insuranceDeduction = salaryInfo.baseSalary * 0.105;
        const totalDeductions = deductions + insuranceDeduction;

        // CHUAN THUE THU NHAP CA NHAN (TNCN) - BLLD & LUAT THUE TNCN
        // Giam tru gia canh ban than nguoi nop thue = 11,000,000 VND / thang
        const PERSONAL_DEDUCTION = 11000000;
        const taxableIncome = Math.max(0, grossSalary + allowance - deductions - insuranceDeduction - PERSONAL_DEDUCTION);
        
        // Tinh thue theo bieu thue luy tien tung phan
        let tax = 0;
        if (taxableIncome > 0) {
          if (taxableIncome <= 5000000) {
            tax = taxableIncome * 0.05;
          } else if (taxableIncome <= 10000000) {
            tax = taxableIncome * 0.10 - 250000;
          } else if (taxableIncome <= 18000000) {
            tax = taxableIncome * 0.15 - 750000;
          } else if (taxableIncome <= 32000000) {
            tax = taxableIncome * 0.20 - 1650000;
          } else if (taxableIncome <= 52000000) {
            tax = taxableIncome * 0.25 - 3250000;
          } else if (taxableIncome <= 80000000) {
            tax = taxableIncome * 0.30 - 5850000;
          } else {
            tax = taxableIncome * 0.35 - 9850000;
          }
        }
        tax = Math.max(0, Math.round(tax));

        let payroll = await Payroll.findOne({
          where: { employeeId: emp.id, periodMonth: month, periodYear: year }
        });

        // BẢO VỆ BẢNG LƯƠNG ĐÃ CHI TRẢ (STATUS === 'PAID')
        // Neu bang luong da o trang thai Paid, he thong bao ve khong ghi de so lieu de dam bao tinh toan ven ke toan
        if (payroll && payroll.status === 'Paid') {
          results.push(payroll);
          continue;
        }

        // Tính tổng Ứng lương đã duyệt trong tháng
        const { AdvanceRequest } = require('../models');
        const advanceRequests = await AdvanceRequest.findAll({
          where: { employeeId: emp.id, periodMonth: month, periodYear: year, status: 'Approved' }
        });
        const totalAdvanceApproved = advanceRequests.reduce((sum, req) => sum + parseFloat(req.amount), 0);

        // Lấy manual advancePayment từ payroll (nếu admin có sửa bằng tay)
        const manualAdvance = payroll && payroll.advancePayment ? parseFloat(payroll.advancePayment) : 0;
        const advancePayment = Math.max(manualAdvance, totalAdvanceApproved);

        const netSalary = Math.max(0, grossSalary + allowance - totalDeductions - tax - advancePayment);
        
        const totalWorkedHours = totalRegularHours + totalWeekdayOvertimeHours + totalWeekendOvertimeHours;
        const payrollData = {
          baseSalary: salaryInfo.baseSalary,
          allowance,
          workedHours: Math.round(totalWorkedHours * 10) / 10,
          overtimePay: Math.round(overtimePay),
          deductions: Math.round(totalDeductions),
          tax: Math.round(tax),
          advancePayment: Math.round(advancePayment),
          netSalary: Math.round(netSalary)
        };

        if (payroll) {
          // CHUẨN TÀI CHÍNH / KẾ TOÁN: Nếu bảng lương đã thanh toán (Paid), bỏ qua không tính đè để bảo toàn dữ liệu đối soát
          if (payroll.status === 'Paid') {
            results.push(payroll);
            continue;
          }
          await payroll.update({ ...payrollData, status: 'Pending' });
        } else {
          payroll = await Payroll.create({ ...payrollData, employeeId: emp.id, periodMonth: month, periodYear: year, status: 'Pending' });
        }
        
        results.push(payroll);
      }

      res.json({ message: 'Đã tính lương thành công', count: results.length, data: results });
    } catch (error) {
      console.error('Error calculating payroll:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung cho Ke toan hoac Admin cap nhat trang thai bang luong (Pending, Approved, Paid)
  // PUT /api/payroll/:id/status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const payroll = await Payroll.findByPk(id);
      if (!payroll) return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
      if (payroll.status === 'Paid') {
        return res.status(400).json({ message: 'Bảng lương này đã được thanh toán (Paid), không thể chỉnh sửa tạm ứng nữa' });
      }

      await payroll.update({ status });
      res.json({ message: 'Đã cập nhật trạng thái', payroll });
    } catch (error) {
      console.error('Error updating payroll status:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de Ke toan dieu chinh so tien tam ung bang tay tren mot ban ghi bang luong
  // Giai thich code khong thuan: Tinh chenh lech so voi so cu de tu dong cap nhat lai netSalary tuong ung
  // PUT /api/payroll/:id/advance
  static async updateAdvancePayment(req, res) {
    try {
      const { id } = req.params;
      const { advancePayment } = req.body;
      const payroll = await Payroll.findByPk(id);
      if (!payroll) return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
      if (payroll.status === 'Paid') {
        return res.status(400).json({ message: 'Bảng lương này đã được thanh toán (Paid), không thể chỉnh sửa tạm ứng nữa' });
      }

      const newAdvance = parseFloat(advancePayment) || 0;
      const oldAdvance = parseFloat(payroll.advancePayment) || 0;
      const diff = newAdvance - oldAdvance;
      const newNetSalary = parseFloat(payroll.netSalary) - diff;

      await payroll.update({ advancePayment: newAdvance, netSalary: Math.max(0, newNetSalary) });
      res.json({ message: 'Đã cập nhật tạm ứng lương', payroll });
    } catch (error) {
      console.error('Error updating advance payment:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de phe duyet hang loat bang luong cua ca thang va gui email phieu luong cho tung nguoi
  // Giai thich code khong thuan:
  // - Chuyen trang thai sang 'Approved'
  // - Truy van lich su cham cong chi tiet cua tung nhan vien trong thang de tao bang HTML
  // - Dung Nodemailer gui email phieu luong chi tiet (Lương CB, OT, Khau tru, Tam ung, Thuc nhan) den email nhan vien
  // POST /api/payroll/approve-all
  static async approveAll(req, res) {
    try {
      const { month, year, payrollIds } = req.body;
      if (!month || !year) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tháng và năm' });
      }

      const whereClause = { periodMonth: month, periodYear: year };
      if (payrollIds && Array.isArray(payrollIds) && payrollIds.length > 0) {
        whereClause.id = { [Op.in]: payrollIds };
      }

      const payrolls = await Payroll.findAll({
        where: whereClause,
        include: [{ 
          model: Employee, 
          as: 'employee',
          where: { isDeleted: false },
          include: [
            { model: Salary, as: 'salaryInfo' },
            { model: require('../models').OnboardingRecord, as: 'onboarding' }
          ]
        }]
      });

      if (payrolls.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy bảng lương nào cho kỳ này' });
      }

      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.SMTP_PORT || 587,
        auth: {
            user: process.env.SMTP_USER || 'test@ethereal.email',
            pass: process.env.SMTP_PASS || 'pass'
        }
      });

      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      let sentCount = 0;

      for (const payroll of payrolls) {
        await payroll.update({ status: 'Approved' });

        // Get attendances for this month to include in email
        const attendances = await Attendance.findAll({
          where: {
            employeeId: payroll.employeeId,
            date: {
              [Op.between]: [startDate, endDate]
            },
            status: {
              [Op.in]: ['Present', 'Late', 'Half-day']
            }
          },
          order: [['date', 'ASC']]
        });

        let attendanceHtml = `
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f3f4f6;">
              <th>Ngày</th>
              <th>Giờ vào</th>
              <th>Giờ ra</th>
              <th>Số giờ</th>
            </tr>
        `;

        attendances.forEach(att => {
          let hours = 0;
          let inTime = att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('vi-VN') : '-';
          let outTime = att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('vi-VN') : '-';
          
          if (att.checkInTime && att.checkOutTime) {
            const checkIn = new Date(att.checkInTime);
            const checkOut = new Date(att.checkOutTime);
            hours = (checkOut - checkIn) / (1000 * 60 * 60);
            if (hours > 5) hours -= 1; // Nghỉ trưa
          }
          
          attendanceHtml += `
            <tr>
              <td style="text-align: center;">${new Date(att.date).toLocaleDateString('vi-VN')}</td>
              <td style="text-align: center;">${inTime}</td>
              <td style="text-align: center;">${outTime}</td>
              <td style="text-align: center;">${hours > 0 ? hours.toFixed(2) + ' h' : '-'}</td>
            </tr>
          `;
        });
        attendanceHtml += `</table>`;

        const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

        transporter.sendMail({
          from: '"HRMS Admin" <admin@hrms.com>',
          to: payroll.employee.email,
          subject: `Phiếu lương tháng ${month}/${year} - HRMS 4.0`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Phiếu lương tháng ${month}/${year}</h2>
              <p>Xin chào <strong>${payroll.employee.fullName}</strong> (${payroll.employee.code}),</p>
              <p>Phòng Hành chính Nhân sự xin gửi bạn chi tiết bảng lương tháng này:</p>
              
              <ul style="list-style: none; padding-left: 0;">
                <li><strong>Lương cơ bản:</strong> ${formatCurrency(payroll.baseSalary)}</li>
                <li><strong>Phụ cấp:</strong> ${formatCurrency(payroll.allowance)}</li>
                <li><strong>Tổng giờ làm thực tế:</strong> ${Number(payroll.workedHours || 0).toFixed(2)} giờ</li>
                <li><strong>Thưởng OT (150%):</strong> <span style="color: green;">${formatCurrency(payroll.overtimePay)}</span></li>
                <li><strong>Khấu trừ &amp; Thuế:</strong> <span style="color: red;">${formatCurrency(Number(payroll.deductions) + Number(payroll.tax))}</span></li>
                <li><strong>Ứng lương:</strong> <span style="color: red;">${formatCurrency(payroll.advancePayment)}</span></li>
                <li><h3 style="color: #2563eb;">Thực nhận: ${formatCurrency(payroll.netSalary)}</h3></li>
              </ul>
              
              <h3>Chi tiết điểm danh (Check-in/Check-out)</h3>
              ${attendanceHtml}
              
              <p style="margin-top: 20px;">Trân trọng,<br/>Phòng Hành chính Nhân sự</p>
            </div>
          `
        }).catch(err => console.error('Lỗi gửi mail bảng lương:', err.message));
        
        sentCount++;
      }

      res.json({ message: `Đã duyệt bảng lương và gửi ${sentCount} email thành công!` });
    } catch (error) {
      console.error('Error approving all payrolls:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de xuat du lieu bang luong ca thang ra file Excel (.xlsx) de ke toan luu tru va bao cao
  // Giai thich code khong thuan: Su dung thu vien exceljs tao Workbook, dinh nghia cac cot va stream truc tiep ra response buffer
  // GET /api/payroll/export-excel
  static async exportExcel(req, res) {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tháng và năm' });
      }

      const payrolls = await Payroll.findAll({
        where: { periodMonth: month, periodYear: year },
        include: [{ 
          model: Employee, 
          as: 'employee', 
          attributes: ['id', 'fullName', 'code', 'department']
        }],
        order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']]
      });

      if (payrolls.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy bảng lương nào cho kỳ này' });
      }

      const exceljs = require('exceljs');
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet(`Lương T${month}-${year}`);

      worksheet.columns = [
        { header: 'Mã NV', key: 'code', width: 15 },
        { header: 'Họ và tên', key: 'fullName', width: 30 },
        { header: 'Phòng ban', key: 'department', width: 20 },
        { header: 'Lương CB', key: 'baseSalary', width: 20 },
        { header: 'Phụ cấp', key: 'allowance', width: 15 },
        { header: 'Giờ làm', key: 'workedHours', width: 15 },
        { header: 'Tiền OT', key: 'overtimePay', width: 20 },
        { header: 'Khấu trừ (Bảo hiểm & Đi trễ)', key: 'deductions', width: 25 },
        { header: 'Thuế', key: 'tax', width: 15 },
        { header: 'Ứng lương', key: 'advancePayment', width: 20 },
        { header: 'Thực nhận', key: 'netSalary', width: 20 },
      ];

      payrolls.forEach(p => {
        worksheet.addRow({
          code: p.employee.code,
          fullName: p.employee.fullName,
          department: p.employee.department,
          baseSalary: p.baseSalary,
          allowance: p.allowance,
          workedHours: p.workedHours,
          overtimePay: p.overtimePay,
          deductions: p.deductions,
          tax: p.tax,
          advancePayment: p.advancePayment,
          netSalary: p.netSalary,
        });
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=BangLuong_T${month}_${year}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting excel:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }
}

module.exports = PayrollController;
