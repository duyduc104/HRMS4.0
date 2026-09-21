const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RoleExtensionRequirement = sequelize.define('RoleExtensionRequirement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Bắt buộc cài Extension cho Role này'
  }
}, {
  tableName: 'RoleExtensionRequirements',
  timestamps: true,
});

module.exports = RoleExtensionRequirement;
