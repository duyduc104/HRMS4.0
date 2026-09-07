const bcrypt = require('bcryptjs');
const Employee = require('../../models/Employee');
const Role = require('../../models/Role');
const EmployeeExtensionRequirement = require('../../models/EmployeeExtensionRequirement');
const RoleExtensionRequirement = require('../../models/RoleExtensionRequirement');
const FaceVectorService = require('../../services/faceVectorService');
const CryptoService = require('../../services/cryptoService');

class AuthStrategy {
  /**
   * Helper kiểm tra yêu cầu Extension
   * Trả về true nếu yêu cầu bật extension, ngược lại false
   */
  static async checkExtensionRequirement(user) {
    let requiresExt = false;
    const empReq = await EmployeeExtensionRequirement.findOne({ where: { employeeId: user.id } });
    
    if (empReq) {
      requiresExt = empReq.isRequired;
    } else if (user.roles && user.roles.length > 0) {
      const roleIds = user.roles.map(r => r.id);
      const roleReqs = await RoleExtensionRequirement.findAll({ where: { roleId: roleIds } });
      if (roleReqs.length > 0) {
        const hasExemption = roleReqs.some(r => r.isRequired === false);
        if (hasExemption) {
          requiresExt = false;
        } else {
          requiresExt = roleReqs.some(r => r.isRequired === true);
        }
      }
    }
    return requiresExt;
  }
}

class PasswordLoginStrategy extends AuthStrategy {
  static async authenticate(username, password, extensionActive) {
    const user = await Employee.findOne({ 
      where: { username },
      include: [{ model: Role, as: 'roles' }]
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw { status: 401, message: 'Sai username hoặc mật khẩu' };
    }

    if (user.isDeleted) {
      throw { status: 403, message: 'Tài khoản của bạn đã bị khóa hoặc xóa khỏi hệ thống' };
    }

    const requiresExt = await this.checkExtensionRequirement(user);
    if (requiresExt && !extensionActive) {
      throw { 
        status: 403, 
        message: 'Tài khoản của bạn YÊU CẦU bật HRMS Extension để đăng nhập. Vui lòng cài đặt và bật Extension!',
        errorCode: 'EXTENSION_REQUIRED'
      };
    }

    return { user, requiresExt };
  }
}

class FaceIDLoginStrategy extends AuthStrategy {
  static async authenticate(username, faceVector, extensionActive) {
    if (!faceVector || !Array.isArray(faceVector) || faceVector.length === 0) {
      throw { status: 400, message: 'Dữ liệu khuôn mặt không hợp lệ' };
    }

    const user = await Employee.findOne({ 
      where: { username },
      include: [{ model: Role, as: 'roles' }]
    });

    if (!user) {
      throw { status: 401, message: 'Không tìm thấy user' };
    }

    if (user.isDeleted) {
      throw { status: 403, message: 'Tài khoản của bạn đã bị khóa hoặc xóa khỏi hệ thống' };
    }

    if (!user.faceEncoding || !user.faceEncodingIV) {
      throw { status: 401, message: 'Tài khoản chưa đăng ký khuôn mặt. Vui lòng đăng ký lại với Face ID.' };
    }

    // Giải mã vector từ DB
    const decryptedString = CryptoService.decrypt(user.faceEncoding, user.faceEncodingIV);
    if (!decryptedString) {
      throw { status: 500, message: 'Lỗi giải mã dữ liệu khuôn mặt. Vui lòng đăng ký lại Face ID.' };
    }

    let storedVector;
    try {
      storedVector = JSON.parse(decryptedString);
    } catch (parseErr) {
      throw { status: 500, message: 'Dữ liệu khuôn mặt bị hỏng. Vui lòng đăng ký lại Face ID.' };
    }

    // Đối chiếu (dùng ngưỡng 0.60 theo logic cũ)
    const isMatch = FaceVectorService.compareFace(faceVector, storedVector, 0.60);
    if (!isMatch) {
      throw { status: 401, message: 'Khuôn mặt không khớp' };
    }

    const requiresExt = await this.checkExtensionRequirement(user);
    if (requiresExt && !extensionActive) {
      throw { 
        status: 403, 
        message: 'Tài khoản của bạn YÊU CẦU bật HRMS Extension để đăng nhập. Vui lòng cài đặt và bật Extension!',
        errorCode: 'EXTENSION_REQUIRED'
      };
    }

    return { user, requiresExt };
  }
}

module.exports = {
  PasswordLoginStrategy,
  FaceIDLoginStrategy
};
