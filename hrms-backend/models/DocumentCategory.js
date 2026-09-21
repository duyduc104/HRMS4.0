const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentCategory = sequelize.define('DocumentCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'DocumentCategories',
      key: 'id',
    }
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  tableName: 'DocumentCategories',
  timestamps: true,
});

module.exports = DocumentCategory;
