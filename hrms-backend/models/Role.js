const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    // e.g., 'admin', 'hr_manager', 'department_manager', 'employee'
  },
  description: {
    type: DataTypes.STRING,
  }
}, {
  tableName: 'Roles',
  timestamps: true,
});

module.exports = Role;
