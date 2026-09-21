const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const WebAccessLog = sequelize.define('WebAccessLog', {
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
      key: 'id'
    }
  },
  url: {
    type: DataTypes.STRING(2048),
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM('allowed', 'blocked'),
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device: {
    type: DataTypes.STRING,
    allowNull: true
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'WebAccessLogs',
  timestamps: false,
});

// Thiết lập quan hệ
Employee.hasMany(WebAccessLog, { foreignKey: 'employeeId' });
WebAccessLog.belongsTo(Employee, { foreignKey: 'employeeId' });

module.exports = WebAccessLog;
