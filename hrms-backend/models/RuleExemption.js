const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RuleExemption = sequelize.define('RuleExemption', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ruleId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'RuleExemptions',
  timestamps: false,
});

module.exports = RuleExemption;
