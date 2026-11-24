// Service quan ly hang doi bat dong bo cho tac vu AI bang Bull Queue va Redis
// Giai thich code khong thuan:
// - Su dung Bull Queue ket noi voi Redis chay ngam de giai quyet do tre cao khi goi Gemini API ma khong chan HTTP request chinh.
// - Phan biet cac nguon tac vu (source):
//   + anomaly_detection: Phan tich cac URL bi chan mang noi bo va ban ket qua vao Socket admin_room.
//   + web: AI Chat web, luu vao DB va phat Socket realtime ve user.
//   + telegram: AI Bot tren Telegram, edit tin nhan dang suy nghi (thinkingMessageId) de cap nhat ket qua cho user.

const Queue = require('bull');
const { Message, WebAccessLog } = require('../models');
const { Op } = require('sequelize');
const { handleAIQuery } = require('./aiService');
const { GoogleGenAI } = require('@google/genai');

// Khoi tao hang doi Bull cho AI Chat
const aiQueue = new Queue('ai-chat-queue', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Ham nay dung de xu ly cac task trong hang doi: phan tich bat thuong web log hoac sinh hoi dap AI chat cho Web/Telegram
aiQueue.process(async (job) => {
  const { source, userId, content, userRoles, history, chatId, currentPath } = job.data;
  
  try {
    console.log(`[AI Queue] Đang xử lý task từ ${source} cho user ${job.data.employeeId || userId}`);
    
    if (source === 'anomaly_detection') {
      
      const blockedLogs = await WebAccessLog.findAll({
        where: {
          employeeId: job.data.employeeId,
          action: 'blocked',
          timestamp: { [Op.gte]: new Date(job.data.date + 'T00:00:00') }
        },
        attributes: ['url', 'timestamp'],
        order: [['timestamp', 'ASC']]
      });
      
      const urlList = blockedLogs.map(l => l.url).join('\n');
      
      const prompt = `Bạn là chuyên gia bảo mật mạng. Phân tích danh sách URL bị chặn của nhân viên "${job.data.employeeName}" trong ngày ${job.data.date}:
      
${urlList}

Trả về JSON:
{
  "riskLevel": "THẤP|TRUNG BÌNH|CAO|RẤT CAO",
  "categories": ["mạng xã hội", "giải trí", "độc hại"],
  "pattern": "mô tả xu hướng truy cập",
  "recommendation": "đề xuất cho admin"
}`;

      // Giả sử ta import handleAIQuery hoặc dùng trực tiếp. Vì aiService không export object `ai`, ta có thể bypass hoặc cần import GoogleGenAI.
      const { GoogleGenAI } = require('@google/genai');
      const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const aiResult = await aiClient.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const analysis = JSON.parse(aiResult.text);
      
      if (global.io) {
        global.io.to('admin_room').emit('security_ai_analysis', {
          employeeId: job.data.employeeId,
          employeeName: job.data.employeeName,
          blockedCount: job.data.blockedCount,
          analysis
        });
      }
      return;
    }

    const aiResponse = await handleAIQuery(userId, content, userRoles, history, currentPath);

    if (source === 'web') {
      // 1. Lưu tin nhắn của AI vào CSDL
      const aiMsg = await Message.create({
        senderId: 'ai-bot',
        receiverId: userId.toString(),
        content: aiResponse
      });

      // 2. Lấy global.io để đẩy realtime về client
      if (global.io) {
        global.io.to(userId.toString()).emit('ai_response', aiMsg);
      }
    } else if (source === 'telegram') {
      // Import telegramBot tại thời điểm thực thi để tránh vòng lặp phụ thuộc (circular dependency)
      const bot = require('./telegramBot');
      if (bot) {
         if (job.data.thinkingMessageId) {
           bot.editMessageText(aiResponse, {
             chat_id: chatId,
             message_id: job.data.thinkingMessageId,
             parse_mode: 'Markdown'
           }).catch(err => {
             console.error('[AI Queue] Lỗi edit message (có thể do Markdown):', err.message);
             // Thử gửi lại không dùng parse_mode để tránh sập bot
             bot.editMessageText(aiResponse, {
               chat_id: chatId,
               message_id: job.data.thinkingMessageId
             }).catch(err2 => {
               bot.sendMessage(chatId, aiResponse).catch(e => console.error('[AI Queue] Fallback 1 error:', e.message));
             });
           });
         } else {
           bot.sendMessage(chatId, aiResponse, { parse_mode: 'Markdown' }).catch(err => {
             // Fallback nếu markdown lỗi
             bot.sendMessage(chatId, aiResponse).catch(e => console.error('[AI Queue] Fallback 2 error:', e.message));
           });
         }
      }
    }
  } catch (error) {
    console.error('[AI Queue] Lỗi khi xử lý task:', error);
    
    const errorMsg = '❌ Trợ lý AI hiện đang bận hoặc gặp lỗi (Rate limit). Vui lòng thử lại sau vài phút.';
    
    if (source === 'web') {
      if (global.io) {
         global.io.to(userId.toString()).emit('ai_response', { content: errorMsg });
      }
    } else if (source === 'telegram') {
      const bot = require('./telegramBot');
      if (bot) {
         if (job.data.thinkingMessageId) {
           bot.editMessageText(errorMsg, {
             chat_id: chatId,
             message_id: job.data.thinkingMessageId
           }).catch(() => bot.sendMessage(chatId, errorMsg));
         } else {
           bot.sendMessage(chatId, errorMsg);
         }
      }
    }
  }
});

// Bắt các sự kiện lỗi của Queue
aiQueue.on('error', (error) => {
  console.error('[AI Queue] Lỗi Redis:', error);
});

module.exports = aiQueue;
