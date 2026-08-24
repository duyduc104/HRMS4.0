# Kế hoạch triển khai Real-time cho Access Log (Không cần F5)

Dựa vào cấu trúc hiện tại của dự án, HRMS 4.0 đã được cài đặt sẵn **Socket.io** (`socket.js` và `req.app.get('io')` trong `server.js`). Do đó, cách tốt nhất và nhẹ nhất để làm cho luồng nhật ký truy cập (Web Access Log) hoạt động theo thời gian thực là phát (emit) sự kiện qua Socket.io ngay khi có một log mới được ghi vào database.

Dưới đây là các bước chi tiết để triển khai:

## Bước 1: Cập nhật Backend (Phát sự kiện Socket)

Chúng ta cần sửa hàm `addLog` trong file `hrms-backend/controllers/webFilterController.js` để phát thông báo `new_access_log` qua socket mỗi khi extension của nhân viên gửi log về.

**Chỉnh sửa `addLog` trong `webFilterController.js`:**

```javascript
exports.addLog = async (req, res) => {
  try {
    const { employeeId, url, action, device, os, browser } = req.body;
    
    // Lấy IP từ request
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress || 'Unknown';
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') ipAddress = '127.0.0.1 (Localhost)';
    
    // Tạo log mới trong DB
    const log = await WebAccessLog.create({
      employeeId, url, action, ipAddress, device, os, browser
    });

    // LẤY THÔNG TIN NHÂN VIÊN ĐỂ KÈM VÀO LOG (Bởi vì FE cần hiển thị Tên, Email)
    const { Employee } = require('../models');
    const employee = await Employee.findByPk(employeeId, {
      attributes: ['id', 'fullName', 'email']
    });

    // Tạo payload để gửi qua Socket
    const logDataForSocket = {
      ...log.toJSON(),
      Employee: employee ? employee.toJSON() : null
    };

    // PHÁT SỰ KIỆN SOCKET
    const io = req.app.get('io');
    if (io) {
      // Bạn có thể phát tới tất cả mọi người, hoặc chỉ phát vào room 'admin' nếu có phân chia room
      io.emit('new_access_log', logDataForSocket);
    }
    
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
```

## Bước 2: Cập nhật Frontend (Lắng nghe & Cập nhật State)

Tại giao diện màn hình quản trị của Admin (File chứa bảng Access Logs, ví dụ: `AccessLogsTable.tsx` hoặc `SecurityDashboard.tsx`), bạn sử dụng hook `useEffect` để bắt sự kiện từ Socket và đẩy log mới lên đầu danh sách (unshift).

**Mẫu code Frontend (React JS):**

```tsx
import { useEffect, useState } from 'react';
// Import socket instance của bạn (hoặc lấy từ Context nếu bạn dùng Context)
import socket from '@/services/socket'; 

const AccessLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalBlocked: 0, totalAllowed: 0 });

  // Load log lần đầu bằng API bình thường (như cũ)
  useEffect(() => {
    fetchLogsAPI().then((res) => {
      setLogs(res.logs);
      setStats(res.stats);
    });
  }, []);

  // LẮNG NGHE SỰ KIỆN SOCKET
  useEffect(() => {
    // Định nghĩa hàm xử lý khi có log mới
    const handleNewLog = (newLog) => {
      // Cập nhật mảng logs (thêm vào đầu mảng)
      setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 1000)); // Giữ max 1000 dòng để không lag UI

      // Tự động cập nhật lại Stats
      setStats((prevStats) => ({
        ...prevStats,
        totalBlocked: newLog.action === 'blocked' ? prevStats.totalBlocked + 1 : prevStats.totalBlocked,
        totalAllowed: newLog.action === 'allowed' ? prevStats.totalAllowed + 1 : prevStats.totalAllowed,
      }));
    };

    // Lắng nghe sự kiện
    socket.on('new_access_log', handleNewLog);

    // Dọn dẹp sự kiện khi unmount component
    return () => {
      socket.off('new_access_log', handleNewLog);
    };
  }, []);

  return (
    <div>
      {/* Giao diện Dashboard render ra danh sách {logs} */}
    </div>
  );
};
```

## Nâng cấp bổ sung (Tùy chọn)

**1. Real-time cho Extension Status (Heartbeat)**
Nếu bạn cũng muốn danh sách trạng thái máy trạm (Ai đang online/offline) cập nhật real-time mà không cần tải lại, có thể sửa tương tự ở hàm `exports.heartbeat`:

```javascript
exports.heartbeat = async (req, res) => {
    // ... logic như cũ ...
    
    // Phát thông báo user đang online
    const io = req.app.get('io');
    if (io) {
      io.emit('extension_status_update', { employeeId, status: 'active', lastPing: new Date() });
    }
    
    res.json({ message: 'Heartbeat received' });
}
```

Ở Frontend, lắng nghe `extension_status_update` để chuyển icon màu đỏ (offline) sang màu xanh lá (online).

**2. Gửi Notification (Toast) nếu có cảnh báo khẩn**
Ở Frontend, bên trong `handleNewLog`, nếu `newLog.action === 'blocked'`, bạn có thể bật 1 Toast nhỏ góc màn hình:
`toast.warning(\`Nhân viên ${newLog.Employee.fullName} vừa cố truy cập trang bị cấm!\`)`
