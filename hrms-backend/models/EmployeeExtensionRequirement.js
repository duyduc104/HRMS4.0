const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmployeeExtensionRequirement = sequelize.define('EmployeeExtensionRequirement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Cấu hình ghi đè bắt buộc cài Extension cho riêng Nhân viên này'
  }
}, {
  tableName: 'EmployeeExtensionRequirements',
  timestamps: true,
});

module.exports = EmployeeExtensionRequirement;
