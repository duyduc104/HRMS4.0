const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const Attendance = sequelize.define('Attendance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  checkInTime: {
    type: DataTypes.DATE,
  },
  checkOutTime: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Late', 'Half-day'),
    defaultValue: 'Present',
  },
  location: {
    type: DataTypes.STRING,
  },
  notes: {
    type: DataTypes.STRING,
  },
  explanationRequested: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  explanationText: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'Attendances',
  timestamps: true,
});

module.exports = Attendance;
