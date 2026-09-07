const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');
const Role = require('./Role');

const EmployeeRole = sequelize.define('EmployeeRole', {
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Employee,
      key: 'id'
    }
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Role,
      key: 'id'
    }
  }
}, {
  tableName: 'EmployeeRoles',
  timestamps: false,
});

module.exports = EmployeeRole;
