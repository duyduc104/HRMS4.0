const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'FileText',
  },
  group: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'OVERVIEW',
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  allowedRoles: {
    type: DataTypes.TEXT, // Stored as JSON string e.g. ["admin", "hr_manager"]
    allowNull: true,
  },
  featureKey: {
    type: DataTypes.STRING, // e.g. "ENABLE_POLICIES"
    allowNull: true,
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'MenuItems',
  timestamps: true,
});

module.exports = MenuItem;
