const { Op } = require('sequelize');
const { Message, Employee } = require('../models');
const { handleAIQuery } = require('../services/aiService');
const aiQueue = require('../services/aiQueueService');

class ChatController {
  // Ham nay dung de lay toan bo lich su tro chuyen 1-1 giua nguoi dung hien tai va mot doi tac (partnerId)
  // GET /api/chat/history/:partnerId
  static async getHistory(req, res) {
    try {
      const currentUserId = req.user.id.toString();
      const partnerId = req.params.partnerId;

      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { senderId: currentUserId, receiverId: partnerId },
            { senderId: partnerId, receiverId: currentUserId }
          ]
        },
        order: [['createdAt', 'ASC']],
        include: [
          {
            model: Message,
            as: 'replyTo',
            attributes: ['id', 'content', 'type', 'fileUrl', 'senderId']
          }
        ]
      });

      res.status(200).json(messages);
    } catch (error) {
      console.error('[Chat] Lỗi lấy lịch sử chat:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung de gui tin nhan tro chuyen (giua 2 nguoi dung hoac giua nguoi dung voi Tro ly AI)
  // Giai thich code khong thuan:
  // - Luu tin nhan vao CSDL
  // - Neu nguoi nhan la 'ai-bot': Day tac vu vao Bull Queue qua Redis de xu ly bat dong bo; neu Redis khong phan hoi trong 1 giay thi tu dong fallback goi truc tiep aiService.handleAIQuery va ban ket qua qua Socket.io
  // - Neu gui cho dong nghiep khac: Phat su kien realtime Socket.io 'receive_message' toi phong cua receiverId
  // POST /api/chat/send
  static async sendMessage(req, res) {
    try {
      const currentUserId = req.user.id.toString();
      const { receiverId, content, type = 'text', fileUrl, replyToId, history, currentPath } = req.body;

      if (!receiverId || (!content && type === 'text')) {
        return res.status(400).json({ message: 'Thiếu dữ liệu' });
      }

      // 1. Lưu tin nhắn người dùng gửi vào CSDL
      let newMessage = await Message.create({
        senderId: currentUserId,
        receiverId: receiverId.toString(),
        content: content || '',
        type,
        fileUrl,
        replyToId
      });

      // Lấy thông tin replyTo để trả về
      newMessage = await Message.findByPk(newMessage.id, {
        include: [{
          model: Message,
          as: 'replyTo',
          attributes: ['id', 'content', 'type', 'fileUrl', 'senderId']
        }]
      });

      // Nếu người nhận là AI Bot
      if (receiverId === 'ai-bot') {
        const userRoles = req.user.roles || [req.user.role];
        
        const runAIDirect = async () => {
          try {
            const aiResponse = await handleAIQuery(currentUserId, content, userRoles, history, currentPath);
            const aiMsg = await Message.create({
              senderId: 'ai-bot',
              receiverId: currentUserId,
              content: aiResponse
            });
            const io = req.app.get('io') || global.io;
            if (io) {
              io.to(currentUserId).emit('ai_response', aiMsg);
            }
          } catch (directErr) {
            console.error('[Chat] Lỗi xử lý AI trực tiếp:', directErr);
            const io = req.app.get('io') || global.io;
            if (io) {
              io.to(currentUserId).emit('ai_response', { content: '❌ Trợ lý AI hiện đang bận hoặc gặp lỗi (Rate limit). Vui lòng thử lại sau.' });
            }
          }
        };

        try {
          // Thử đẩy vào Queue, nếu Redis không phản hồi trong 1s thì chuyển sang xử lý trực tiếp
          await Promise.race([
            aiQueue.add({
              source: 'web',
              userId: currentUserId,
              content,
              userRoles,
              history,
              currentPath
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
          ]);
        } catch (queueErr) {
          console.warn('[Chat] Redis Queue không khả dụng, chuyển sang xử lý AI trực tiếp:', queueErr.message);
          setImmediate(runAIDirect);
        }

        return res.status(202).json({
          message: 'Tin nhắn đang được xử lý',
          sentMessage: newMessage
        });
      }

      // Lấy io instance từ app
      const io = req.app.get('io');

      // Nếu gửi cho người khác, chỉ cần trả về tin nhắn đã gửi và bắn socket cho người nhận
      if (io && receiverId !== 'ai-bot') {
        io.to(receiverId.toString()).emit('receive_message', newMessage);
      }

      res.status(201).json({
        message: 'Tin nhắn đã được lưu',
        sentMessage: newMessage
      });

    } catch (error) {
      console.error('[Chat] Lỗi gửi tin nhắn:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }

  // Ham nay dung de phan tich cau lenh giong noi (Voice to text) thanh du lieu JSON bieu mau (vi du: don nghi phep)
  // Giai thich code khong thuan: Goi aiService.parseVoiceToForm su dung Gemini NLP de boc tach thoi gian, loai phep, ly do va tu dong bat loi RATE_LIMIT 429
  // POST /api/chat/parse-voice
  static async parseVoiceCommand(req, res) {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: 'Không có dữ liệu văn bản' });

      const { parseVoiceToForm } = require('../services/aiService');
      const result = await parseVoiceToForm(text);
      res.json(result);
    } catch (error) {
      console.error('[Chat] Lỗi parse voice command:', error);
      if (error.message && error.message.startsWith('RATE_LIMIT:')) {
        const delay = error.message.split(':')[1];
        return res.status(429).json({ message: 'Quá tải API', retryAfter: parseInt(delay) || 60 });
      }
      res.status(500).json({ message: 'Lỗi xử lý giọng nói' });
    }
  }
}

module.exports = ChatController;
