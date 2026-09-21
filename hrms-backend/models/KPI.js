const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const KPI = sequelize.define('KPI', {
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
      key: 'id',
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  targetScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  achievedScore: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Not Started', 'In Progress', 'At Risk', 'Achieved'),
    defaultValue: 'Not Started',
  },
  reviewPeriod: {
    type: DataTypes.STRING, // e.g. "Q1-2026"
    allowNull: false,
  }
}, {
  tableName: 'KPIs',
  timestamps: true,
});

module.exports = KPI;
