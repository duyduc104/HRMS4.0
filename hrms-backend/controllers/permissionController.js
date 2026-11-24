const { DepartmentPermission, EmployeePermission, Employee } = require('../models');

// Danh sách Modules & Actions hỗ trợ trong hệ thống
const SYSTEM_MODULES = [
  { key: 'ATTENDANCE', label: 'Quản lý Chấm công' },
  { key: 'LEAVE', label: 'Quản lý Nghỉ phép' },
  { key: 'PAYROLL', label: 'Quản lý Bảng lương & Ứng lương' },
  { key: 'EMPLOYEES', label: 'Quản lý Nhân sự' },
  { key: 'POLICIES', label: 'Chính sách & Quy định' },
  { key: 'DOCUMENTS', label: 'Kho Tài liệu Doanh nghiệp' },
  { key: 'CHAT', label: 'Mạng nội bộ & Chat' },
  { key: 'EVENTS', label: 'Lịch & Sự kiện' },
  { key: 'SETTINGS', label: 'Cấu hình & Phân quyền' }
];

const SYSTEM_ACTIONS = [
  { key: 'VIEW', label: 'Xem' },
  { key: 'CREATE', label: 'Tạo mới' },
  { key: 'EDIT', label: 'Sửa' },
  { key: 'DELETE', label: 'Xóa' },
  { key: 'APPROVE', label: 'Duyệt' },
  { key: 'DOWNLOAD', label: 'Tải file' },
  { key: 'EXPORT', label: 'Xuất file' }
];

// Ham nay dung de lay danh sach metadata cac Modules va Actions he thong ho tro de client dung ma tran phan quyen
// === 1. Lấy danh sách Metadata Modules & Actions ===
exports.getMeta = async (req, res) => {
  res.json({
    modules: SYSTEM_MODULES,
    actions: SYSTEM_ACTIONS
  });
};

// Ham nay dung de lay toan bo ma tran phan quyen theo Phong ban hoac Vai tro (DepartmentPermission)
// === 2. Lấy ma trận quyền Phòng ban / Role ===
exports.getDepartmentPermissions = async (req, res) => {
  try {
    const permissions = await DepartmentPermission.findAll();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de cap nhat hang loat quyen thao tac (isAllowed) cho mot phong ban/vai tro
// Giai thich code khong thuan: Lap qua mang permissions, neu da co ban ghi thi update, chua co thi tao moi de dong bo ma tran quyen
// === 3. Lưu / Cập nhật ma trận quyền Phòng ban ===
exports.updateDepartmentPermissions = async (req, res) => {
  try {
    const { department, permissions } = req.body;

    if (!department || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }

    for (const p of permissions) {
      const existing = await DepartmentPermission.findOne({
        where: { department, module: p.module, action: p.action }
      });
      if (existing) {
        await existing.update({ isAllowed: p.isAllowed });
      } else {
        await DepartmentPermission.create({
          department,
          module: p.module,
          action: p.action,
          isAllowed: p.isAllowed
        });
      }
    }

    res.json({ message: `Đã cập nhật ma trận phân quyền cho phòng ban / vai trò [${department}] thành công!` });
  } catch (error) {
    console.error('Lỗi updateDepartmentPermissions:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de lay ma tran phan quyen ghi de (override) rieng cho mot nhan vien cu the
// === 4. Lấy ma trận quyền riêng của Nhân viên ===
exports.getEmployeePermissions = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const permissions = await EmployeePermission.findAll({
      where: { employeeId }
    });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de luu/cap nhat ma tran quyen rieng biet de cap them hoac thu hoi quyen dac thu cua mot nhan vien
// === 5. Lưu / Cập nhật ma trận quyền riêng cho Nhân viên ===
exports.updateEmployeePermissions = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { permissions } = req.body;

    if (!employeeId || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }

    for (const p of permissions) {
      const existing = await EmployeePermission.findOne({
        where: { employeeId, module: p.module, action: p.action }
      });
      if (existing) {
        await existing.update({ isAllowed: p.isAllowed });
      } else {
        await EmployeePermission.create({
          employeeId,
          module: p.module,
          action: p.action,
          isAllowed: p.isAllowed
        });
      }
    }

    res.json({ message: 'Đã cập nhật ma trận quyền đè cho nhân viên thành công!' });
  } catch (error) {
    console.error('Lỗi updateEmployeePermissions:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de Admin toi cao cap hoac tuoc quyen Admin toan he thong (isAdmin = true/false) cho mot nhan vien
// === 6. Bật / Tắt cờ isAdmin của Nhân viên ===
exports.toggleEmployeeAdmin = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { isAdmin } = req.body;

    const employee = await Employee.findByPk(employeeId);
    if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

    await employee.update({ isAdmin });

    res.json({ message: `Đã ${isAdmin ? 'CẤP' : 'TUỚC'} quyền Admin tối cao cho ${employee.fullName}` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
