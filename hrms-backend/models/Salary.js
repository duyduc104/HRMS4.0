const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const Salary = sequelize.define('Salary', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // One-to-One
    references: {
      model: Employee,
      key: 'id',
    }
  },
  baseSalary: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 15000000,
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 50000, // Ví dụ 50,000 VND / giờ
  },
  otMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    defaultValue: 1.5,
  },
  allowance: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  bankAccount: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'Salaries',
  timestamps: true,
});

module.exports = Salary;
