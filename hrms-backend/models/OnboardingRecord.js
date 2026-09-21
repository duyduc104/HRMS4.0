const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OnboardingRecord = sequelize.define('OnboardingRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  dob: { type: DataTypes.DATEONLY },
  phone: { type: DataTypes.STRING },
  idCardNumber: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  idCardFrontUrl: { type: DataTypes.TEXT('long') },
  idCardBackUrl: { type: DataTypes.TEXT('long') },
  bankName: { type: DataTypes.STRING },
  bankAccountNumber: { type: DataTypes.STRING },
  bankAccountName: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'OnboardingRecords',
  timestamps: true,
});

module.exports = OnboardingRecord;
