const express = require('express');
const { Role, Employee, EmployeeRole, RoleExtensionRequirement } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

function getRoleDescription(name) {
  const desc = {
    'admin': 'Toàn quyền hệ thống, bảo mật, cấu hình.',
    'hr_manager': 'Quản lý nhân sự, duyệt lương, báo cáo.',
    'department_manager': 'Duyệt đơn nghỉ, quản lý phòng ban.',
    'employee': 'Chấm công, xem lương, xin nghỉ.'
  };
  return desc[name] || 'Người dùng hệ thống';
}

function getRoleDisplayName(name) {
  const display = {
    'admin': 'Admin',
    'hr_manager': 'HR Manager',
    'department_manager': 'Department Manager',
    'employee': 'Employee'
  };
  return display[name] || name;
}

// GET /api/roles - Lấy danh sách các role và số lượng nhân viên
router.get('/', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{
        model: Employee,
        as: 'employees',
        attributes: ['id'] // Chỉ lấy ID để đếm số lượng
      }, {
        model: RoleExtensionRequirement,
        as: 'extensionRequirement',
        attributes: ['isRequired']
      }]
    });
    
    // Map data for UI
    const roleStats = roles.map(role => {
      return {
        id: role.id,
        name: role.name,
        displayName: getRoleDisplayName(role.name),
        description: role.description || getRoleDescription(role.name),
        count: role.employees ? role.employees.length : 0,
        requiresExtension: role.extensionRequirement ? role.extensionRequirement.isRequired : false
      };
    });
    
    // Sort logic to match expected UI order
    const sortOrder = { 'admin': 1, 'hr_manager': 2, 'department_manager': 3, 'employee': 4 };
    roleStats.sort((a, b) => (sortOrder[a.name] || 99) - (sortOrder[b.name] || 99));

    res.json(roleStats);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách role:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// PUT /api/roles/assign - Cập nhật phân quyền cho 1 nhân viên
router.put('/assign', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { employeeId, roleNames } = req.body; // roleNames = ['admin', 'employee'] vv
    
    if (!employeeId || !roleNames || !Array.isArray(roleNames)) {
      return res.status(400).json({ message: 'Dữ liệu đầu vào không hợp lệ' });
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

    // Always assign 'employee' role as baseline if not present
    if (!roleNames.includes('employee')) {
      roleNames.push('employee');
    }

    const roles = await Role.findAll({
      where: { name: roleNames }
    });

    if (roles.length === 0) {
      return res.status(400).json({ message: 'Không tìm thấy role tương ứng' });
    }

    // SetRoles is a Sequelize magic method created by belongsToMany
    await employee.setRoles(roles);
    
    res.json({ message: 'Cập nhật phân quyền thành công' });
  } catch (error) {
    console.error('Lỗi cập nhật phân quyền:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// PUT /api/roles/:id/extension-requirement - Update extension requirement
router.put('/:id/extension-requirement', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { isRequired } = req.body;
    let reqConfig = await RoleExtensionRequirement.findOne({ where: { roleId: req.params.id } });
    if (reqConfig) {
      await reqConfig.update({ isRequired });
    } else {
      reqConfig = await RoleExtensionRequirement.create({ roleId: req.params.id, isRequired });
    }
    res.json({ message: 'Cập nhật thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
