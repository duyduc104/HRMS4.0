const { AdvanceRequest, Employee, Payroll, Salary, ScheduledEvent } = require('../models');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');

class AdvanceRequestController {
  // Ham nay dung de lay danh sach cac yeu cau tam ung luong cua chinh nhan vien dang dang nhap (Ho tro phan trang)
  // GET /api/advance-requests/me
  static async getMyRequests(req, res) {
    try {
      const { month, year } = req.query;
      const where = { employeeId: req.user.id };
      if (month) where.periodMonth = month;
      if (year) where.periodYear = year;

      const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
      const queryOptions = {
        where,
        order: [['createdAt', 'DESC']]
      };

      if (isPaginated) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
        const { count, rows } = await AdvanceRequest.findAndCountAll(queryOptions);
        return formatPaginatedResponse(res, count, rows, page, limit);
      }

      const requests = await AdvanceRequest.findAll(queryOptions);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung cho Ke toan hoac Admin xem toan bo danh sach cac yeu cau tam ung luong trong cong ty (Ho tro phan trang)
  // GET /api/advance-requests
  static async getAllRequests(req, res) {
    try {
      // Kiem tra tham quyen: Chi Admin hoac Ke toan / HR Manager moi co quyen xem
      const userRole = (req.user?.role || '').toLowerCase().replace(/\s+/g, '_');
      const userRoles = (req.user?.roles || []).map(r => 
        (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
      );
      const allRoles = [...new Set([userRole, ...userRoles])];
      const hasPermission = allRoles.some(r => ['admin', 'hr_manager', 'accountant'].includes(r));

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Từ chối truy cập: Chỉ Quản trị viên hoặc Bộ phận Kế toán / Nhân sự mới có quyền xem danh sách tạm ứng lương toàn công ty!' 
        });
      }

      const { month, year, employeeId } = req.query;
      const where = {};
      if (month) where.periodMonth = month;
      if (year) where.periodYear = year;
      if (employeeId) where.employeeId = employeeId;

      const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
      const queryOptions = {
        where,
        include: [{ 
          model: Employee, 
          as: 'employee', 
          attributes: ['id', 'fullName', 'code'],
          include: [
            { model: Salary, as: 'salaryInfo', attributes: ['bankAccount', 'bankName', 'baseSalary'] },
            { model: require('../models').OnboardingRecord, as: 'onboarding', attributes: ['bankAccountNumber', 'bankName'] }
          ]
        }],
        order: [['createdAt', 'DESC']]
      };

      if (isPaginated) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
        const { count, rows } = await AdvanceRequest.findAndCountAll(queryOptions);
        return formatPaginatedResponse(res, count, rows, page, limit);
      }

      const requests = await AdvanceRequest.findAll(queryOptions);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de nhan vien tao yeu cau xin tam ung mot khoan tien cho ky luong thang/nam
  // CHUAN DOANH NGHIEP:
  // - Validate so tien duong (amount > 0)
  // - Gioi han tam ung khong qua 50% muc luong co ban cua nhan vien
  // - Chan tao nhieu don Pending trong cung mot ky luong
  // POST /api/advance-requests
  static async createRequest(req, res) {
    try {
      const { amount, reason, periodMonth, periodYear } = req.body;
      const parsedAmount = parseFloat(amount);

      if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Số tiền tạm ứng phải là một số dương hợp lệ' });
      }

      const targetMonth = parseInt(periodMonth) || (new Date().getMonth() + 1);
      const targetYear = parseInt(periodYear) || new Date().getFullYear();

      // Kiểm tra xem đã có đơn Pending trong cùng kỳ chưa
      const existingPending = await AdvanceRequest.findOne({
        where: {
          employeeId: req.user.id,
          periodMonth: targetMonth,
          periodYear: targetYear,
          status: 'Pending'
        }
      });

      if (existingPending) {
        return res.status(400).json({ 
          message: `Bạn đang có một yêu cầu tạm ứng lương tháng ${targetMonth}/${targetYear} đang chờ duyệt. Vui lòng chờ phê duyệt trước khi tạo yêu cầu mới.` 
        });
      }

      // Kiểm tra hạn mức tạm ứng tối đa (chuẩn doanh nghiệp: tối đa 50% lương cơ bản)
      const salaryRecord = await Salary.findOne({ where: { employeeId: req.user.id } });
      const baseSalary = salaryRecord ? parseFloat(salaryRecord.baseSalary) : 15000000;
      const maxAdvanceLimit = baseSalary * 0.5;

      if (parsedAmount > maxAdvanceLimit) {
        const formattedLimit = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(maxAdvanceLimit);
        return res.status(400).json({ 
          message: `Số tiền tạm ứng vượt quá hạn mức cho phép (tối đa 50% lương cơ bản, tương đương ${formattedLimit})` 
        });
      }

      const request = await AdvanceRequest.create({
        employeeId: req.user.id,
        amount: parsedAmount,
        reason: reason || 'Tạm ứng lương định kỳ',
        periodMonth: targetMonth,
        periodYear: targetYear,
        status: 'Pending'
      });

      res.status(201).json({ message: 'Tạo yêu cầu ứng lương thành công', request });
    } catch (error) {
      console.error('[AdvanceRequest create]', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung cho Ke toan hoac Admin cap nhat trang thai don tam ung (Approved / Rejected)
  // CHUAN DOANH NGHIEP:
  // - Kiem tra role nghiem ngat: Chi Admin hoac Ke toan / HR Manager moi co quyen duyet
  // - Chan tu duyet (Self-approval prevention)
  // - Chon loc trang thai, tranh duyet lap (Idempotency) gay tru tien 2 lan vao Payroll
  // - Luu nguoi duyet, thoi diem duyet va ly do tu choi
  // PUT /api/advance-requests/:id/status
  static async updateStatus(req, res) {
    try {
      // 1. Kiem tra tham quyen phe duyet: Chi Admin hoac Ke toan / HR Manager moi duoc duyet
      const userRole = (req.user?.role || '').toLowerCase().replace(/\s+/g, '_');
      const userRoles = (req.user?.roles || []).map(r => 
        (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
      );
      const allRoles = [...new Set([userRole, ...userRoles])];
      const hasApprovalPermission = allRoles.some(r => ['admin', 'accountant'].includes(r));

      if (!hasApprovalPermission) {
        return res.status(403).json({ 
          message: 'Từ chối truy cập: Chỉ Quản trị viên hoặc Bộ phận Kế toán / Nhân sự mới có thẩm quyền phê duyệt yêu cầu tạm ứng lương!' 
        });
      }

      const { id } = req.params;
      const { status, reason: rejectionReason } = req.body;

      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ. Chỉ chấp nhận Approved hoặc Rejected' });
      }

      const request = await AdvanceRequest.findByPk(id, {
        include: [{ model: Employee, as: 'employee' }]
      });
      if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });

      // Chặn tự duyệt (Self-approval prevention)
      if (request.employeeId === req.user.id) {
        return res.status(403).json({ 
          message: 'Theo quy chế kiểm soát nội bộ doanh nghiệp, bạn không thể tự phê duyệt đơn tạm ứng lương của chính mình!' 
        });
      }

      // Tránh duyệt lặp (Idempotency)
      if (request.status === 'Approved' && status === 'Approved') {
        return res.status(400).json({ message: 'Yêu cầu ứng lương này đã được phê duyệt trước đó' });
      }

      const updateData = { 
        status,
        approvedBy: req.user.id,
        approvedAt: new Date()
      };

      if (status === 'Rejected') {
        updateData.rejectionReason = rejectionReason || 'Cấp quản lý từ chối yêu cầu tạm ứng';
      }

      await request.update(updateData);

      // Nếu Approved, cộng dồn số tiền vào bảng Payroll nếu đã có bản ghi
      if (status === 'Approved') {
        let payroll = await Payroll.findOne({
          where: {
            employeeId: request.employeeId,
            periodMonth: request.periodMonth,
            periodYear: request.periodYear
          }
        });

        if (payroll) {
          const currentAdvance = parseFloat(payroll.advancePayment || 0);
          const newAdvance = currentAdvance + parseFloat(request.amount);
          const newNetSalary = parseFloat(payroll.netSalary) - parseFloat(request.amount);
          
          await payroll.update({
            advancePayment: newAdvance,
            netSalary: Math.max(0, newNetSalary)
          });
        }

        // --- Gửi email thông báo cho nhân viên ---
        if (request.employee && request.employee.email) {
          await ScheduledEvent.create({
            creatorId: req.user.id,
            title: 'Phê duyệt Ứng lương',
            type: 'EMAIL',
            scheduledAt: new Date(),
            status: 'PENDING',
            payload: {
              to: request.employee.email,
              subject: 'HRMS - Yêu cầu ứng lương đã được phê duyệt',
              body: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2>Xin chào ${request.employee.fullName},</h2>
                  <p>Yêu cầu ứng lương của bạn đã được phê duyệt.</p>
                  <ul>
                    <li><strong>Kỳ lương:</strong> Tháng ${request.periodMonth}/${request.periodYear}</li>
                    <li><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.amount)}</li>
                    <li><strong>Lý do:</strong> ${request.reason || 'Không có'}</li>
                  </ul>
                  <p>Số tiền này sẽ được tự động cộng dồn và khấu trừ vào khoản "Thực nhận" trong phiếu lương tháng ${request.periodMonth}/${request.periodYear} của bạn.</p>
                  <p>Trân trọng,</p>
                  <p><strong>Phòng Nhân Sự HRMS</strong></p>
                </div>
              `
            }
          });
        }
      }

      res.json({ message: `Đã cập nhật trạng thái thành ${status}`, request });
    } catch (error) {
      console.error('[AdvanceRequest updateStatus]', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }
}

module.exports = AdvanceRequestController;
