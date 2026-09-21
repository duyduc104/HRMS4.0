const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const PolicyDocument = sequelize.define('PolicyDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('POLICY', 'ANNOUNCEMENT', 'EVENT', 'GUIDELINE'),
    defaultValue: 'POLICY',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true, // Trích xuất văn bản từ PDF/DOCX cho AI đọc
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contactEmployeeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Employee,
      key: 'id',
    }
  },
  targetRoles: {
    type: DataTypes.TEXT, // Lấy JSON string mảng role: ["admin", "hr_manager", "employee"] hoặc ["ALL"]
    allowNull: false,
    defaultValue: '["ALL"]',
    get() {
      const rawValue = this.getDataValue('targetRoles');
      try {
        return rawValue ? JSON.parse(rawValue) : ["ALL"];
      } catch (e) {
        return ["ALL"];
      }
    },
    set(val) {
      this.setDataValue('targetRoles', typeof val === 'string' ? val : JSON.stringify(val));
    }
  },
  scheduledPublishAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED'),
    defaultValue: 'PUBLISHED',
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Employee,
      key: 'id',
    }
  }
}, {
  tableName: 'PolicyDocuments',
  timestamps: true,
});

module.exports = PolicyDocument;
