const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const TelegramAccount = sequelize.define('TelegramAccount', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: Employee,
      key: 'id',
    }
  },
  chatId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'TelegramAccounts',
  timestamps: true,
});

module.exports = TelegramAccount;
