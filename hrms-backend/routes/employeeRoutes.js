const express = require('express');
const { Employee, Role, Salary, EmployeeExtensionRequirement, OnboardingRecord } = require('../models');
const bcrypt = require('bcryptjs');
const roleMiddleware = require('../middleware/roleMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/employees - Get all employees (Hỗ trợ phân trang & tìm kiếm)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const { search, department, status } = req.query;

    const where = { isDeleted: false };
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    const queryOptions = {
      where,
      attributes: ['id', 'fullName', 'username', 'email', 'code', 'department', 'status', 'position'],
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['name']
      }, {
        model: EmployeeExtensionRequirement,
        as: 'extensionRequirement',
        attributes: ['isRequired']
      }],
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      const { count, rows } = await Employee.findAndCountAll(queryOptions);
      return formatPaginatedResponse(res, count, rows, page, limit);
    }

    const employees = await Employee.findAll(queryOptions);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// POST /api/employees/:id/force-logout - Bắt buộc nhân viên đăng xuất
router.post('/:id/force-logout', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const employeeId = req.params.id;
    const employee = await Employee.findByPk(employeeId);
    if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

    // Phát sự kiện qua socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('force_logout', { employeeId });
    }

    res.json({ message: 'Đã gửi yêu cầu đăng xuất bắt buộc' });
  } catch (error) {
    console.error('Lỗi khi force logout:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});


// POST /api/employees - Create a new employee (Admin or HR Manager)
// Phan quyen chi tiet:
// - admin: co the tao tat ca cac role (employee, department_manager, hr_manager, admin)
// - hr_manager: chi duoc tao role 'employee', khong duoc tao role cao hon
router.post('/', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  const t = await require('../config/database').transaction();
  try {
    const { 
      fullName, username, password, email, department, role, code,
      position, status, joinDate, bankName, bankAccount, baseSalary
    } = req.body;
    
    // Validate
    if (!fullName || !username || !password || !department || !role) {
      await t.rollback();
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    // Kiem tra phan quyen theo role: hr_manager chi duoc tao role 'employee'
    const requesterRoles = (req.user.roles || [req.user.role]).map(r =>
      typeof r === 'string' ? r.toLowerCase() : r.name?.toLowerCase()
    );
    const isAdmin = requesterRoles.includes('admin');
    const restrictedRoles = ['hr_manager', 'department_manager', 'admin'];

    if (!isAdmin && restrictedRoles.includes(role.toLowerCase())) {
      await t.rollback();
      return res.status(403).json({ 
        message: `Bạn không có quyền tạo tài khoản với role '${role}'. Chỉ Admin mới được tạo HR, Trưởng phòng hoặc Admin.` 
      });
    }

    const existingUser = await Employee.findOne({ where: { username }, transaction: t });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({ message: 'Username đã tồn tại' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const employeeCode = code || `EMP-${Date.now()}`;

    const newEmployee = await Employee.create({
      fullName,
      username,
      email,
      department,
      passwordHash,
      code: employeeCode,
      position: position || null,
      status: status || 'active',
      joinDate: joinDate || new Date()
    }, { transaction: t });

    const roleObj = await Role.findOne({ where: { name: role }, transaction: t });
    if (roleObj) {
      await newEmployee.addRole(roleObj, { transaction: t });
    }

    // Create Salary config if provided
    if (baseSalary || bankName || bankAccount) {
      await Salary.create({
        employeeId: newEmployee.id,
        baseSalary: baseSalary || 15000000,
        hourlyRate: 50000,
        allowance: 0,
        bankName: bankName || null,
        bankAccount: bankAccount || null
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ message: 'Tạo nhân viên thành công', employee: newEmployee });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi khi tạo nhân viên:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// GET /api/employees/me/profile - Lấy thông tin cá nhân của chính mình
router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    const emp = await Employee.findOne({
      where: { id: req.user.id, isDeleted: false },
      attributes: ['id', 'fullName', 'username', 'code', 'department', 'status', 'email', 'allowRemoteAttendance', 'joinDate', 'position'],
      include: [
        { model: Role, as: 'roles', attributes: ['name'] },
        { model: OnboardingRecord, as: 'onboarding' }
      ]
    });
    if (!emp) return res.status(404).json({ message: 'Không tìm thấy thông tin nhân viên' });
    res.json(emp);
  } catch (error) {
    console.error('Lỗi khi lấy hồ sơ cá nhân:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// PUT /api/employees/me/profile - Cập nhật thông tin cá nhân của chính mình
router.put('/me/profile', authMiddleware, async (req, res) => {
  try {
    const emp = await Employee.findOne({ where: { id: req.user.id, isDeleted: false } });
    if (!emp) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

    const { fullName, email, phone } = req.body;
    if (fullName) emp.fullName = fullName;
    if (email) emp.email = email;
    await emp.save();

    // Nếu có cập nhật số điện thoại và có onboarding record, lưu vào onboarding
    if (phone) {
      const ob = await OnboardingRecord.findOne({ where: { employeeId: emp.id } });
      if (ob) {
        await ob.update({ phone });
      }
    }

    res.json({ message: 'Cập nhật hồ sơ cá nhân thành công', employee: emp });
  } catch (error) {
    console.error('Lỗi khi cập nhật hồ sơ cá nhân:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const emp = await Employee.findOne({
      where: { id: req.params.id, isDeleted: false },
      attributes: ['id', 'fullName', 'username', 'code', 'department', 'status', 'email', 'allowRemoteAttendance', 'joinDate', 'position'],
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['name']
        },
        {
          model: OnboardingRecord,
          as: 'onboarding'
        }
      ]
    });
    if (!emp) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }
    res.json(emp);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin nhân viên:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// PUT /api/employees/:id - Update employee (Admin or HR Manager)
// CHUAN DOANH NGHIEP:
// - Chi Admin moi co quyen thay doi Role cua nguoi dung
// - Khong cho phep nguoi dung tu thay doi Role cua chinh minh de leo thang dac quyen (Privilege Escalation Prevention)
router.put('/:id', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const emp = await Employee.findOne({ 
      where: { id: req.params.id, isDeleted: false },
      include: [{ model: Role, as: 'roles' }]
    });
    if (!emp) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }

    const requesterRoles = (req.user.roles || [req.user.role]).map(r =>
      typeof r === 'string' ? r.toLowerCase() : r.name?.toLowerCase()
    );
    const isAdmin = requesterRoles.includes('admin');

    const { fullName, department, status, role, allowRemoteAttendance, position, joinDate } = req.body;

    // Kiem tra phan quyen khi thay doi Role
    if (role) {
      if (!isAdmin) {
        return res.status(403).json({ 
          message: 'Theo quy chuẩn phân quyền, chỉ Quản trị viên (Admin) mới có quyền thay đổi vai trò (Role) của nhân viên!' 
        });
      }
      if (emp.id === req.user.id && role.toLowerCase() !== 'admin') {
        return res.status(400).json({ 
          message: 'Bạn không thể tự tước quyền Admin của chính mình trên giao diện này!' 
        });
      }
      const roleObj = await Role.findOne({ where: { name: role } });
      if (roleObj) {
        await emp.setRoles([roleObj]);
      }
    }

    if (fullName !== undefined) emp.fullName = fullName;
    if (department !== undefined) emp.department = department;
    if (status !== undefined) emp.status = status;
    if (allowRemoteAttendance !== undefined) emp.allowRemoteAttendance = allowRemoteAttendance;
    if (position !== undefined) emp.position = position;
    if (joinDate !== undefined) emp.joinDate = joinDate;

    await emp.save();

    res.json({ message: 'Cập nhật nhân viên thành công', employee: emp });
  } catch (error) {
    console.error('Lỗi khi cập nhật nhân viên:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// GET /api/employees/:id/salary - Lấy thông tin lương (Admin/HR)
router.get('/:id/salary', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const salary = await Salary.findOne({ where: { employeeId: req.params.id } });
    if (!salary) {
      return res.status(404).json({ message: 'Chưa cấu hình lương cho nhân viên này' });
    }
    res.json(salary);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin lương:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// PUT /api/employees/:id/salary - Cập nhật thông tin lương (Admin/HR)
router.put('/:id/salary', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const { baseSalary, hourlyRate, allowance, bankAccount, bankName } = req.body;
    let salary = await Salary.findOne({ where: { employeeId: req.params.id } });

    if (salary) {
      await salary.update({ baseSalary, hourlyRate, allowance, bankAccount, bankName });
    } else {
      salary = await Salary.create({
        employeeId: req.params.id,
        baseSalary,
        hourlyRate,
        allowance,
        bankAccount,
        bankName
      });
    }
    res.json({ message: 'Đã cập nhật cấu hình lương', salary });
  } catch (error) {
    console.error('Lỗi khi cập nhật lương:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// PUT /api/employees/:id/extension-requirement - Update extension requirement
router.put('/:id/extension-requirement', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const { isRequired } = req.body;
    let reqConfig = await EmployeeExtensionRequirement.findOne({ where: { employeeId: req.params.id } });
    if (reqConfig) {
      if (isRequired === null) {
        await reqConfig.destroy(); // Clear specific override
      } else {
        await reqConfig.update({ isRequired });
      }
    } else if (isRequired !== null) {
      reqConfig = await EmployeeExtensionRequirement.create({ employeeId: req.params.id, isRequired });
    }
    res.json({ message: 'Cập nhật thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// DELETE /api/employees/:id - Soft delete employee
// CHUAN DOANH NGHIEP:
// - Chan tu xoa tai khoan cua chinh minh
// - Chan HR Manager xoa tai khoan cua Ban Giam Doc / Admin
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const targetId = req.params.id;

    // 1. Chặn tự xóa chính mình
    if (targetId === req.user.id.toString()) {
      return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const emp = await Employee.findOne({ 
      where: { id: targetId, isDeleted: false },
      include: [{ model: Role, as: 'roles' }]
    });
    if (!emp) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }

    // 2. Chặn HR Manager xóa tài khoản Admin
    const requesterRoles = (req.user.roles || [req.user.role]).map(r =>
      typeof r === 'string' ? r.toLowerCase() : r.name?.toLowerCase()
    );
    const isAdmin = requesterRoles.includes('admin');
    const targetRoles = (emp.roles || []).map(r => r.name?.toLowerCase());

    if (!isAdmin && targetRoles.includes('admin')) {
      return res.status(403).json({ 
        message: 'Bạn không có quyền xóa tài khoản của Quản trị viên / Ban Giám Đốc!' 
      });
    }

    emp.status = 'resigned';
    emp.isDeleted = true;
    await emp.save();

    // Phát sự kiện qua socket.io để đá người dùng ra ngay lập tức
    const io = req.app.get('io');
    if (io) {
      io.emit('force_logout', { employeeId: targetId });
    }
    
    res.json({ message: 'Đã xóa nhân viên' });
  } catch (error) {
    console.error('Lỗi khi xóa nhân viên:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;
