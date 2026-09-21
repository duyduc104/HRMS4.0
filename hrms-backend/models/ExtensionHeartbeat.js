const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const ExtensionHeartbeat = sequelize.define('ExtensionHeartbeat', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // Mỗi nhân viên chỉ có 1 bản ghi heartbeat
    references: { model: Employee, key: 'id' }
  },
  lastPing: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true
  },
  extensionVersion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    // active: đang hoạt động, inactive: ngừng ping > 5 phút
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'ExtensionHeartbeats',
  timestamps: false,
});

Employee.hasOne(ExtensionHeartbeat, { foreignKey: 'employeeId' });
ExtensionHeartbeat.belongsTo(Employee, { foreignKey: 'employeeId' });

module.exports = ExtensionHeartbeat;
