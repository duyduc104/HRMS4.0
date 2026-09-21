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
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending',
  },
  reason: {
    type: DataTypes.TEXT,
  },
  approvedBy: {
    type: DataTypes.UUID, // ID of manager who approved
    allowNull: true,
  }
}, {
  tableName: 'Leaves',
  timestamps: true,
});

module.exports = Leave;
