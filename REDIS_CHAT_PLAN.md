# 🚀 Kế hoạch Triển khai Redis cho Hệ thống Chat (Thực tế dự án)

Sau khi đọc cấu trúc dự án hiện tại của bạn (`hrms-backend` đang dùng **Express.js** và cấu hình Socket trong file `socket.js`), mình đã điều chỉnh lại kế hoạch để tích hợp Redis chính xác vào code base của bạn thay vì dùng NestJS như bản trước.

Hiện tại, Redis **đã có sẵn trong `docker-compose.yml`**, nhưng Backend chưa kết nối đến nó.

---

## 1. Mục đích sử dụng Redis cho dự án của bạn

1. **Redis Pub/Sub (qua `@socket.io/redis-adapter`):** Hiện tại bạn đang dùng `socket.join(currentUserId)`. Nếu sau này bạn chạy 2 instance Node.js (để load balancing hoặc deploy production), user A kết nối vào server 1, user B kết nối vào server 2 thì server 1 sẽ không thể bắn emit (ví dụ tin nhắn mới) cho user B. Redis Adapter sẽ giải quyết vấn đề đồng bộ này.
2. **Quản lý danh sách "Đang Online":** Hiện tại `socket.js` chỉ `console.log` khi user connect. Bạn cần dùng Redis để lưu trữ danh sách ai đang online. Tốc độ đọc/ghi RAM của Redis cực kỳ phù hợp cho thao tác này thay vì ghi vào DB SQL.

---

## 2. Các bước triển khai Backend

### Bước 2.1: Cài đặt thư viện
Mở terminal tại thư mục backend (`d:\hrms4.0\hrms-backend`) và chạy lệnh cài đặt:
```bash
npm install ioredis @socket.io/redis-adapter
```

### Bước 2.2: Cập nhật file `socket.js`
Bạn cần sửa file `d:\hrms4.0\hrms-backend\socket.js` hiện tại để bọc Redis Adapter vào `io` và thiết lập lưu trạng thái online. Thay thế nội dung bằng code sau:

```javascript
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { Message } = require('./models');
const { handleAIQuery } = require('./services/aiService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// Lấy REDIS config từ biến môi trường (theo docker-compose), mặc định localhost khi dev
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

// Khởi tạo Redis Clients
const pubClient = new Redis(redisPort, redisHost);
const subClient = pubClient.duplicate();
const redisStateClient = pubClient.duplicate(); // Dùng riêng để lưu trữ state (như online users)

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // 1. Gắn Redis Adapter vào Socket.io
  io.adapter(createAdapter(pubClient, subClient));

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

    // 2. Lưu user vào Redis Hash (key: online_users)
    await redisStateClient.hset('online_users', currentUserId, socket.id);
    
    // Broadcast cho mọi người biết user này vừa online (cập nhật chấm xanh UI)
    io.emit('user_status_change', { userId: currentUserId, status: 'online' });

    // Join room private như cũ
    socket.join(currentUserId);

    // Join admin room
    if (['admin', 'hr_manager', 'department_manager'].includes(socket.user.role)) {
      socket.join('admin_room');
    }

    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${socket.user.username}`);
      
      // 3. Xóa user khỏi Redis khi ngắt kết nối
      await redisStateClient.hdel('online_users', currentUserId);
      io.emit('user_status_change', { userId: currentUserId, status: 'offline' });
    });
  });

  return io;
}

module.exports = setupSocket;
```

---

## 3. Tạo API lấy danh sách Online (Tùy chọn)

Vì dữ liệu user online đã nằm trên Redis, khi người dùng mới F5 tải trang, họ cần biết ai đang online. Bạn có thể thêm 1 API vào `chatRoutes.js`:

```javascript
// Thêm vào routes/chatRoutes.js (phần import trên đầu)
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_PORT || 6379, process.env.REDIS_HOST || 'localhost');

// Thêm Route mới
router.get('/online-users', async (req, res) => {
  try {
    // Lấy toàn bộ Hash chứa user online
    const onlineUsersObj = await redis.hgetall('online_users');
    const onlineUserIds = Object.keys(onlineUsersObj); // Trả về mảng ['1', '5', '12']
    
    res.json(onlineUserIds);
  } catch (error) {
    console.error('Lỗi Redis:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách online' });
  }
});
```

Và trên Frontend (React), khi component chat mount, bạn gọi API `/api/chat/online-users` để hiển thị trạng thái chấm xanh cho đúng. 
