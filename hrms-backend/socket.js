const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Message } = require('./models');
const { handleAIQuery } = require('./services/aiService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: Token missing'));
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error: Invalid token'));
      socket.user = decoded; // { id, role, roles, username }
      next();
    });
  });

  io.on('connection', async (socket) => {
    const currentUserId = socket.user.id.toString();
    console.log(`[Socket] User connected: ${socket.user.username} (ID: ${currentUserId})`);

    // Join room based on user ID for private messages
    socket.join(currentUserId);

    // Join admin room for system notifications
    if (socket.user.role === 'admin' || socket.user.role === 'hr_manager' || socket.user.role === 'department_manager') {
      socket.join('admin_room');
    }

    try {
      const { Employee } = require('./models');
      const emp = await Employee.findByPk(currentUserId);
      if (emp) {
        // AI Onboarding: Chào mừng nhân viên mới (tạo trong vòng 24h)
        const isNew = (new Date() - new Date(emp.createdAt)) < 24 * 60 * 60 * 1000;
        if (isNew) {
          setTimeout(() => {
            socket.emit('ai_proactive_message', { 
              content: `👋 Chào mừng **${emp.fullName}** gia nhập công ty! \n\nHôm nay là ngày đầu tiên, bạn đã sẵn sàng chưa? Tôi là **Trợ lý AI** của bạn. \n\nBạn có thể hỏi tôi cách xem bảng lương, xin nghỉ phép, hoặc đọc các chính sách công ty.` 
            });
          }, 3000); // Đợi 3s sau khi connect mới hiện popup
        }
      }
    } catch (err) {
      console.error('[Socket] Error checking onboarding status:', err);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.username}`);
    });
  });

  return io;
}

module.exports = setupSocket;
