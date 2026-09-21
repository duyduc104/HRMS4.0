const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const Payroll = sequelize.define('Payroll', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Employee,
      key: 'id',
    }
  },
  periodMonth: {
    type: DataTypes.INTEGER, // 1-12
    allowNull: false,
  },
  periodYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  baseSalary: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0,
  },
  allowance: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  // Bug 1 fix: workedHours lưu tổng giờ làm thực tế; overtimePay lưu tiền OT
  workedHours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Tổng giờ làm thực tế (giờ thường + giờ OT) trong kỳ lương',
  },
  overtimePay: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    comment: 'Số tiền OT = giờ OT × hourlyRate × 1.5',
  },
  deductions: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  tax: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  advancePayment: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    comment: 'Khoản ứng lương do Admin nhập vào',
  },
  netSalary: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Paid'),
    defaultValue: 'Pending',
  }
}, {
  tableName: 'Payrolls',
  timestamps: true,
});

module.exports = Payroll;
