const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const Leave = sequelize.define('Leave', {
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
  leaveType: {
    type: DataTypes.ENUM('Annual', 'Sick', 'Personal', 'Unpaid'),
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pending',
  },
  reason: {
    type: DataTypes.TEXT,
  },
  managerApprovedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  managerApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  hrApprovedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  hrApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvedBy: {
    type: DataTypes.UUID, // ID of final approver (Admin)
    allowNull: true,
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'Leaves',
  timestamps: true,
});

module.exports = Leave;
