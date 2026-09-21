const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const AttendanceExplanation = sequelize.define('AttendanceExplanation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Employee, key: 'id' }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Late', 'Missing_Punch', 'Leave_Early'),
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending',
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}, {
  tableName: 'AttendanceExplanations',
  timestamps: true,
});

module.exports = AttendanceExplanation;
