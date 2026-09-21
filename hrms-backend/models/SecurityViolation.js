const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SecurityViolation = sequelize.define('SecurityViolation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  blockedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  blockedUrls: {
    type: DataTypes.TEXT, // Store as JSON string or plain text
    allowNull: true
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  adminNote: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Submitted', 'Resolved', 'Rejected'),
    defaultValue: 'Pending'
  }
}, {
  timestamps: true,
  tableName: 'security_violations'
});

module.exports = SecurityViolation;
