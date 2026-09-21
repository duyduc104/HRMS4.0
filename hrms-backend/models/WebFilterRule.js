const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WebFilterRule = sequelize.define('WebFilterRule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  urlPattern: {
    type: DataTypes.STRING,
    allowNull: false,
    // Ví dụ: '*facebook.com*', 'youtube.com'
  },
  type: {
    type: DataTypes.ENUM('blacklist', 'whitelist'),
    allowNull: false,
    defaultValue: 'blacklist'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'WebFilterRules',
  timestamps: true,
});

module.exports = WebFilterRule;
