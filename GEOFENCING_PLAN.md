# Kế Hoạch Triển Khai Chấm Công Geofencing (Khu Vực Địa Lý)

Tính năng này kết hợp nhận diện khuôn mặt (FaceID) với định vị GPS để đảm bảo nhân viên phải có mặt tại Văn phòng mới được chấm công, ngoại trừ các trường hợp được duyệt làm việc từ xa (Remote).

## 1. Kế Hoạch Các Bước (Plan)

### Bước 1: Cập nhật Cấu trúc Dữ liệu (Database)
- **Bảng Employee:** Thêm cột `allowRemoteAttendance` (Boolean, default: false). Dùng để đánh dấu nhân viên được phép chấm công tại nhà (Ví dụ: Sales, Remote Dev).
- **Cấu hình Công ty:** Cần lưu tọa độ chuẩn của công ty. Để đơn giản, ta sẽ lưu cấu hình này vào biến môi trường (File `.env`) hoặc hằng số.

### Bước 2: Viết thuật toán tính khoảng cách (Backend)
- Sử dụng **công thức Haversine** để tính khoảng cách (tính bằng mét) giữa 2 tọa độ (Vĩ độ, Kinh độ). Hàm này chạy rất nhẹ và hoàn toàn dựa trên toán học hình học cầu.

### Bước 3: Cập nhật API Chấm công (Backend)
- Sửa đổi API `POST /api/attendance/check-in` và `check-out`.
- Nhận thêm body: `latitude` và `longitude`.
- Logic:
  1. Kiểm tra xem nhân viên có `allowRemoteAttendance === true` không. Nếu có, cho qua.
  2. Nếu `false`, tính khoảng cách từ vị trí nhận được tới Tọa độ Công ty.
  3. Nếu khoảng cách > 100 mét (bán kính cho phép), trả về lỗi 403: "Bạn không ở văn phòng".

### Bước 4: Cập nhật Giao diện Chấm công (Frontend)
- Ở trang `EmployeeDashboard.tsx`, khi người dùng bấm nút "Bắt đầu chấm công" hoặc "Check-out", trình duyệt sẽ gọi `navigator.geolocation.getCurrentPosition()`.
- Gửi tọa độ lấy được kèm theo vector khuôn mặt lên API.

---

## 2. Code Hoàn Chỉnh (Từng File)

### File 1: Sửa Model Employee (`hrms-backend/models/Employee.js`)
Thêm trường `allowRemoteAttendance`:
```javascript
    // ... các trường cũ
    allowRemoteAttendance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Mặc định phải đến công ty
    },
```

### File 2: Thuật toán Haversine (`hrms-backend/utils/geoUtils.js`)
Tạo một file tiện ích mới để chứa hàm tính khoảng cách:
```javascript
/**
 * Tính khoảng cách (mét) giữa 2 điểm tọa độ bằng công thức Haversine
 */
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Bán kính trái đất tính bằng mét
  const p1 = lat1 * Math.PI/180; 
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
          Math.cos(p1) * Math.cos(p2) *
          Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; 
  return distance; 
}

module.exports = {
  getDistanceFromLatLonInMeters
};
```

### File 3: Cập nhật Controller (`hrms-backend/controllers/attendanceController.js`)
```javascript
const { getDistanceFromLatLonInMeters } = require('../utils/geoUtils');

// Tọa độ văn phòng công ty (Ví dụ: Tòa nhà Landmark 81)
const OFFICE_LAT = 10.7946; 
const OFFICE_LNG = 106.7223;
const ALLOWED_RADIUS = 100; // 100 mét

// Trong hàm checkIn và checkOut, thêm đoạn kiểm tra sau khi xác thực FaceID:
exports.checkIn = async (req, res) => {
  try {
    const { faceVector, employeeId, latitude, longitude } = req.body;
    
    const employee = await Employee.findByPk(employeeId);
    
    // KIỂM TRA ĐỊA LÝ (GEOFENCING)
    if (!employee.allowRemoteAttendance) {
      if (!latitude || !longitude) {
        return res.status(403).json({ message: "Vui lòng cấp quyền truy cập Vị trí (GPS) để chấm công!" });
      }
      
      const distance = getDistanceFromLatLonInMeters(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
      if (distance > ALLOWED_RADIUS) {
        return res.status(403).json({ 
          message: `Bạn đang ở cách công ty ${Math.round(distance)}m. Vui lòng di chuyển vào văn phòng để chấm công! (Cho phép: ${ALLOWED_RADIUS}m)` 
        });
      }
    }

    // ... (Code lưu chấm công bình thường ở bên dưới)
  } catch (error) {
    // ...
  }
};
```

### File 4: Lấy GPS trên Giao diện (`hrms-frontend/src/features/dashboard/EmployeeDashboard.tsx`)
Cập nhật sự kiện click vào nút Check-in:
```tsx
  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt của bạn không hỗ trợ định vị GPS!');
      return;
    }

    toast.loading('Đang lấy vị trí GPS...', { id: 'gps-toast' });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss('gps-toast');
        const { latitude, longitude } = position.coords;
        // Bắt đầu mở Camera và gọi API check-in với tọa độ này
        startFaceScan('checkin', latitude, longitude);
      },
      (error) => {
        toast.dismiss('gps-toast');
        toast.error('Vui lòng cho phép quyền Vị trí (Location) để chấm công!');
        console.error("GPS Error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
```

---
**Nhận xét:**
Kế hoạch này đảm bảo nhân viên không thể ăn gian bằng cách check-in ở nhà bằng khuôn mặt. Hãy nói với tôi nếu bạn muốn tôi bắt đầu tự động chỉnh sửa trực tiếp vào các file dự án của bạn để hoàn thiện tính năng này!
