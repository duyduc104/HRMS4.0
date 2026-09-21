const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DepartmentPermission = sequelize.define('DepartmentPermission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'DepartmentPermissions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['department', 'module', 'action']
    }
  ]
});

module.exports = DepartmentPermission;
