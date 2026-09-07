const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await Employee.findByPk(decoded.id);
    if (!user || user.isDeleted) {
      return res.status(403).json({ 
        message: 'Tài khoản của bạn đã bị khóa hoặc xóa khỏi hệ thống',
        isDeleted: true
      });
    }

    // Gắn thông tin user vào request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      roles: decoded.roles || [decoded.role],
      username: decoded.username,
      department: user.department,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

module.exports = authMiddleware;
