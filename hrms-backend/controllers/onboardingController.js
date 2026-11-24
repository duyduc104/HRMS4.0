const { OnboardingRecord, Employee } = require('../models');

class OnboardingController {
  // Ham nay dung de nhan vien moi nop ho so tiep nhan nhan su (ngay sinh, sdt, so CCCD, anh 2 mat CCCD, tai khoan ngan hang)
  static async submitOnboarding(req, res) {
    try {
      const { dob, phone, idCardNumber, address, idCardFrontUrl, idCardBackUrl, bankName, bankAccountNumber, bankAccountName } = req.body;
      const employeeId = req.user.id;

      const employee = await Employee.findByPk(employeeId);
      if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

      let record = await OnboardingRecord.findOne({ where: { employeeId } });
      if (record) {
        await record.update({ dob, phone, idCardNumber, address, idCardFrontUrl, idCardBackUrl, bankName, bankAccountNumber, bankAccountName, status: 'Pending' });
      } else {
        record = await OnboardingRecord.create({ employeeId, dob, phone, idCardNumber, address, idCardFrontUrl, idCardBackUrl, bankName, bankAccountNumber, bankAccountName });
      }

      res.status(200).json({ message: 'Nộp hồ sơ Onboarding thành công!', record });
    } catch (error) {
      console.error('[submitOnboarding]', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung de nhan vien kiem tra tinh trang ho so Onboarding cua chinh minh
  static async getOnboardingStatus(req, res) {
    try {
      const employeeId = req.user.id;
      const record = await OnboardingRecord.findOne({ where: { employeeId } });
      res.status(200).json({ isOnboarded: !!record, status: record ? record.status : null, record });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung cho Phong Nhan su (HR/Admin) xem toan bo danh sach ho so Onboarding can duyet
  static async getAllPending(req, res) {
    try {
      const records = await OnboardingRecord.findAll({
        include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName', 'code', 'email', 'department'] }],
        order: [['createdAt', 'DESC']]
      });
      res.status(200).json(records);
    } catch (error) {
      console.error('[getAllPending Onboarding]', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }

  // Ham nay dung cho HR/Admin phe duyet hoac tu choi ho so tiep nhan nhan su
  // Giai thich code khong thuan:
  // - Neu Approved, tu dong lay thong tin bankName va bankAccountNumber dong bo sang bang Salary cua nhan vien de sau nay chi tra luong tu dong
  // - Phat socket.io realtime 'onboarding_reviewed' ve may cua nhan vien
  static async reviewOnboarding(req, res) {
    try {
      const { id } = req.params;
      const { status, note } = req.body; // status: 'Approved' | 'Rejected'
      
      const record = await OnboardingRecord.findByPk(id, {
        include: [{ model: Employee, as: 'employee' }]
      });
      if (!record) return res.status(404).json({ message: 'Không tìm thấy hồ sơ onboarding' });

      await record.update({ status, note });

      // Nếu duyệt thành công, tự động cập nhật thông tin ngân hàng sang bảng Salary (upsert)
      if (status === 'Approved' && (record.bankName || record.bankAccountNumber)) {
        const { Salary } = require('../models');
        const salary = await Salary.findOne({ where: { employeeId: record.employeeId } });
        if (salary) {
          await salary.update({
            bankName: record.bankName || salary.bankName,
            bankAccount: record.bankAccountNumber || salary.bankAccount
          });
        } else {
          await Salary.create({
            employeeId: record.employeeId,
            bankName: record.bankName || '',
            bankAccount: record.bankAccountNumber || '',
            baseSalary: 15000000,
            allowance: 0,
            otMultiplier: 1.5
          });
        }
      }

      // Thông báo realtime cho nhân viên
      const io = req.app.get('io');
      if (io && record.employeeId) {
        io.to(record.employeeId.toString()).emit('onboarding_reviewed', {
          status,
          message: status === 'Approved' ? 'Hồ sơ tiếp nhận nhân sự của bạn đã được phê duyệt!' : 'Hồ sơ tiếp nhận nhân sự của bạn bị từ chối. Vui lòng cập nhật lại.'
        });
      }

      res.status(200).json({ message: `Đã ${status === 'Approved' ? 'duyệt' : 'từ chối'} hồ sơ`, record });
    } catch (error) {
      console.error('[reviewOnboarding]', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }
}

module.exports = OnboardingController;
