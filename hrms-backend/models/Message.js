const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  senderId: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  receiverId: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  content: { 
    type: DataTypes.TEXT, 
    allowNull: true // Allow null if it's an image-only message
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'text' // 'text', 'image'
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  replyToId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isRead: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  }
}, {
  tableName: 'messages',
  timestamps: true // adds createdAt, updatedAt
});

module.exports = Message;
