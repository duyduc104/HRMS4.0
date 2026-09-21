const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./Employee');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT, // Lưu text nguyên bản (có dấu) cho AI OCR
    allowNull: true,
  },
  contentUnaccented: {
    type: DataTypes.TEXT, // Lưu text không dấu cho SQL Server Full-Text / Smart Search
    allowNull: true,
  },
  visibility: {
    type: DataTypes.ENUM('PUBLIC', 'PRIVATE'),
    defaultValue: 'PUBLIC',
  },
  targetDepartments: {
    type: DataTypes.TEXT, // JSON string
    allowNull: true,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('targetDepartments');
      try { return rawValue ? JSON.parse(rawValue) : []; } catch (e) { return []; }
    },
    set(val) {
      this.setDataValue('targetDepartments', typeof val === 'string' ? val : JSON.stringify(val));
    }
  },
  targetRoles: {
    type: DataTypes.TEXT, // JSON string
    allowNull: true,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('targetRoles');
      try { return rawValue ? JSON.parse(rawValue) : []; } catch (e) { return []; }
    },
    set(val) {
      this.setDataValue('targetRoles', typeof val === 'string' ? val : JSON.stringify(val));
    }
  },
  targetEmployees: {
    type: DataTypes.TEXT, // JSON string
    allowNull: true,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('targetEmployees');
      try { return rawValue ? JSON.parse(rawValue) : []; } catch (e) { return []; }
    },
    set(val) {
      this.setDataValue('targetEmployees', typeof val === 'string' ? val : JSON.stringify(val));
    }
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Employee,
      key: 'id',
    }
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'DocumentCategories',
      key: 'id',
    }
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED'),
    defaultValue: 'PUBLISHED',
  },
  scheduledPublishAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'Documents',
  timestamps: true,
});

module.exports = Document;
