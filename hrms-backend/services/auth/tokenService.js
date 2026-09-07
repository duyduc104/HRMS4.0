const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

class TokenService {
  /**
   * Tạo JWT Token cho phiên đăng nhập
   * @param {Object} user - Thông tin nhân viên (đã query bao gồm role)
   * @param {number} loginTime - Timestamp phiên đăng nhập hiện tại
   * @param {string} primaryRole - Role chính của nhân viên
   * @param {Array} userRoles - Danh sách các role
   * @returns {string} - JWT Token
   */
  static generateAuthToken(user, loginTime, primaryRole, userRoles) {
    const payload = {
      id: user.id,
      role: primaryRole,
      roles: userRoles,
      username: user.username,
      loginTime
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
  }

  /**
   * Verify token (có thể dùng trong middleware hoặc nếu cần decode tay)
   */
  static verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }
}

module.exports = TokenService;
