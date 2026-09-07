const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user được set từ authMiddleware
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
    }

    // Hỗ trợ cả truyền chuỗi roleMiddleware('admin', 'hr_manager') lẫn mảng roleMiddleware(['admin', 'hr_manager'])
    const rolesList = allowedRoles.flat().map(r => r.toLowerCase().replace(' ', '_'));
    const userRoles = (req.user.roles || [req.user.role]).map(r => typeof r === 'string' ? r.toLowerCase().replace(' ', '_') : r.name?.toLowerCase().replace(' ', '_'));

    const hasAccess = rolesList.some(allowed => userRoles.includes(allowed));
    
    // Nếu allowedRoles được truyền vào dạng ['admin', 'hr_manager']
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Bạn không có quyền truy cập chức năng này (Access Denied)!' 
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
