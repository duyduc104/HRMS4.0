const { DepartmentPermission, EmployeePermission, Employee } = require('../models');

/**
 * Middleware kiểm tra quyền Granular RBAC theo Module & Action
 * @param {string} module - Tên module: 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'EMPLOYEES', 'POLICIES', 'PERFORMANCE', 'CHAT', 'EVENTS', 'SETTINGS'
 * @param {string} action - Hành động: 'VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT'
 */
const checkPermission = (moduleName, actionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Yêu cầu xác thực tài khoản' });
      }

      const userId = req.user.id;
      const userRole = req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
      const userRoles = (req.user.roles || []).map(r => r.name ? r.name.toLowerCase().replace(/\s+/g, '_') : r.toLowerCase());
      
      // 1. Lấy thông tin Employee đầy đủ để kiểm tra cờ isAdmin
      const employee = await Employee.findByPk(userId);
      
      const isAdmin = employee?.isAdmin || userRole === 'admin' || userRoles.includes('admin');

      // NẾU LÀ ADMIN (TRƯỜNG isAdmin = true HOẶC ROLE ADMIN) -> BỎ QUA KIỂM TRA QUYỀN, CẤP TOÀN QUYỀN TRUY CẬP
      if (isAdmin) {
        return next();
      }

      // 2. NẾU KHÔNG PHẢI ADMIN -> TIẾN HÀNH XÉT QUYỀN THEO MA TRẬN
      // a. Kiểm tra Ma trận Quyền đè riêng của Nhân viên (EmployeePermission Override)
      const empPermission = await EmployeePermission.findOne({
        where: {
          employeeId: userId,
          module: moduleName,
          action: actionName
        }
      });

      if (empPermission) {
        if (empPermission.isAllowed) {
          return next();
        } else {
          return res.status(403).json({ 
            message: `Truy cập bị từ chối: Bạn bị tước quyền [${actionName}] trên phân hệ [${moduleName}].` 
          });
        }
      }

      // b. Kiểm tra Ma trận Quyền của Phòng ban / Role (DepartmentPermission)
      const userDept = employee?.department || req.user.department || userRole;
      
      const deptPermission = await DepartmentPermission.findOne({
        where: {
          department: userDept,
          module: moduleName,
          action: actionName
        }
      });

      if (deptPermission) {
        if (deptPermission.isAllowed) {
          return next();
        } else {
          return res.status(403).json({ 
            message: `Truy cập bị từ chối: Phòng ban [${userDept}] không có quyền [${actionName}] trên phân hệ [${moduleName}].` 
          });
        }
      }

      // c. Mặc định: Cho phép VIEW cá nhân, nhưng chặn các hành động tác động dữ liệu khác nếu chưa được cấp quyền
      if (actionName === 'VIEW') {
        return next();
      }

      return res.status(403).json({ 
        message: `Truy cập bị từ chối: Bạn không có quyền [${actionName}] trên phân hệ [${moduleName}].` 
      });

    } catch (error) {
      console.error(`[PermissionMiddleware Error] Module ${moduleName}, Action ${actionName}:`, error);
      res.status(500).json({ message: 'Lỗi kiểm tra phân quyền hệ thống', error: error.message });
    }
  };
};

module.exports = { checkPermission };
