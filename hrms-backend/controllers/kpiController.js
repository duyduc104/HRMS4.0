const { KPI, Employee } = require('../models');
const { Op } = require('sequelize');

class KPIController {
  // Ham nay dung de lay danh sach KPI ca nhan cua nhan vien dang dang nhap theo ky danh gia
  // GET /api/kpis/my - Lấy KPI cá nhân
  static async getMyKPIs(req, res) {
    try {
      const { period } = req.query;
      const where = { employeeId: req.user.id };
      if (period) where.reviewPeriod = period;

      const kpis = await KPI.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });

      res.json(kpis);
    } catch (error) {
      console.error('[KPI] Lỗi lấy KPI cá nhân:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy KPI cá nhân', error: error.message });
    }
  }

  // Ham nay dung cho Admin hoac Manager xem danh sach KPI cua tat ca nhan vien co loc theo employeeId, ky va trang thai
  // GET /api/kpis - Lấy danh sách KPI (Admin/Manager)
  static async getAllKPIs(req, res) {
    try {
      const { employeeId, period, status } = req.query;
      const where = {};
      if (employeeId) where.employeeId = employeeId;
      if (period) where.reviewPeriod = period;
      if (status) where.status = status;

      const kpis = await KPI.findAll({
        where,
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'fullName', 'code', 'department', 'username'],
          where: { isDeleted: false }
        }],
        order: [['createdAt', 'DESC']]
      });

      res.json(kpis);
    } catch (error) {
      console.error('[KPI] Lỗi lấy danh sách KPI:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy danh sách KPI', error: error.message });
    }
  }

  // Ham nay dung de tao moi mot muc tieu KPI danh cho nhan vien (tieu de, diem muc tieu targetScore, ky danh gia)
  // POST /api/kpis - Tạo mới KPI
  static async createKPI(req, res) {
    try {
      const { title, description, targetScore, achievedScore = 0, status = 'Not Started', reviewPeriod, employeeId } = req.body;
      const targetEmpId = employeeId || req.user.id;

      if (!title || targetScore === undefined || !reviewPeriod) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tiêu đề, điểm mục tiêu và kỳ đánh giá' });
      }

      const kpi = await KPI.create({
        employeeId: targetEmpId,
        title,
        description,
        targetScore: parseFloat(targetScore),
        achievedScore: parseFloat(achievedScore) || 0,
        status,
        reviewPeriod
      });

      const fullKPI = await KPI.findByPk(kpi.id, {
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'fullName', 'code', 'department']
        }]
      });

      res.status(201).json({ message: 'Tạo KPI thành công', kpi: fullKPI });
    } catch (error) {
      console.error('[KPI] Lỗi tạo KPI:', error);
      res.status(500).json({ message: 'Lỗi server khi tạo KPI', error: error.message });
    }
  }

  // Ham nay dung cho Quan ly hoac Admin chinh sua thong tin chi tieu KPI
  // PUT /api/kpis/:id - Cập nhật KPI
  static async updateKPI(req, res) {
    try {
      const { id } = req.params;
      const kpi = await KPI.findByPk(id);
      if (!kpi) {
        return res.status(404).json({ message: 'Không tìm thấy KPI' });
      }

      const { title, description, targetScore, achievedScore, status, reviewPeriod } = req.body;
      if (title !== undefined) kpi.title = title;
      if (description !== undefined) kpi.description = description;
      if (targetScore !== undefined) kpi.targetScore = parseFloat(targetScore);
      if (achievedScore !== undefined) kpi.achievedScore = parseFloat(achievedScore);
      if (status !== undefined) kpi.status = status;
      if (reviewPeriod !== undefined) kpi.reviewPeriod = reviewPeriod;

      await kpi.save();

      const updated = await KPI.findByPk(id, {
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'fullName', 'code', 'department']
        }]
      });

      res.json({ message: 'Cập nhật KPI thành công', kpi: updated });
    } catch (error) {
      console.error('[KPI] Lỗi cập nhật KPI:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật KPI', error: error.message });
    }
  }

  // Ham nay dung cho nhan vien hoac quan ly cap nhat tien do diem so thuc dat (achievedScore) cua KPI
  // Giai thich code khong thuan: Tu dong goi y chuyen status sang 'Achieved' neu achievedScore >= targetScore, hoac 'In Progress' neu achievedScore > 0
  // PUT /api/kpis/:id/progress - Nhân viên cập nhật tiến độ / kết quả tự đạt
  static async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { achievedScore, status } = req.body;
      const kpi = await KPI.findByPk(id);

      if (!kpi) {
        return res.status(404).json({ message: 'Không tìm thấy KPI' });
      }

      // Chỉ chủ sở hữu KPI hoặc Admin/Manager mới được cập nhật
      const isOwner = kpi.employeeId === req.user.id;
      const userRoles = req.user.roles || [req.user.role];
      const isManager = userRoles.includes('admin') || userRoles.includes('hr_manager') || userRoles.includes('department_manager');

      if (!isOwner && !isManager) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật KPI này' });
      }

      if (achievedScore !== undefined) {
        kpi.achievedScore = parseFloat(achievedScore);
        // Tự động gợi ý status dựa vào điểm đạt
        if (!status) {
          if (kpi.achievedScore >= kpi.targetScore) {
            kpi.status = 'Achieved';
          } else if (kpi.achievedScore > 0) {
            kpi.status = 'In Progress';
          }
        }
      }
      if (status !== undefined) kpi.status = status;

      await kpi.save();

      res.json({ message: 'Cập nhật tiến độ KPI thành công', kpi });
    } catch (error) {
      console.error('[KPI] Lỗi cập nhật tiến độ:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật tiến độ', error: error.message });
    }
  }

  // Ham nay dung de xoa mot muc tieu KPI khoi he thong
  // DELETE /api/kpis/:id - Xóa KPI
  static async deleteKPI(req, res) {
    try {
      const { id } = req.params;
      const kpi = await KPI.findByPk(id);
      if (!kpi) {
        return res.status(404).json({ message: 'Không tìm thấy KPI' });
      }

      await kpi.destroy();
      res.json({ message: 'Đã xóa KPI thành công' });
    } catch (error) {
      console.error('[KPI] Lỗi xóa KPI:', error);
      res.status(500).json({ message: 'Lỗi server khi xóa KPI', error: error.message });
    }
  }
}

module.exports = KPIController;
