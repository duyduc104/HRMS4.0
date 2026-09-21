const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const ScheduledEvent = sequelize.define('ScheduledEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Employee,
      key: 'id',
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('EMAIL', 'MEETING', 'SYSTEM_JOB'),
    allowNull: false,
    defaultValue: 'EMAIL',
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endAt: {
    type: DataTypes.DATE, // Only used for meetings
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PROCESSING'),
    defaultValue: 'PENDING',
  },
  payload: {
    type: DataTypes.TEXT, // Đổi từ JSON sang TEXT để tương thích với MSSQL
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('payload');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('payload', value ? JSON.stringify(value) : null);
    }
  },
  meetLink: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'ScheduledEvents',
  timestamps: true,
});

module.exports = ScheduledEvent;
