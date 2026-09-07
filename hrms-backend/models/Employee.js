const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  allowRemoteAttendance: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
  },
  position: {
    type: DataTypes.STRING,
  },

  status: {
    type: DataTypes.ENUM('active', 'inactive', 'probation', 'resigned'),
    defaultValue: 'active',
  },
  joinDate: {
    type: DataTypes.DATEONLY,
  },
  faceEncoding: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  faceEncodingIV: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  googleRefreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'Employees',
  timestamps: true,
});

module.exports = Employee;
