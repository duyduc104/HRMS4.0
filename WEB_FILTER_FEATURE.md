# KẾ HOẠCH VÀ MÃ NGUỒN CHỨC NĂNG WEB FILTER (HOÀN CHỈNH)

## 1. Kiến trúc tổng quan

```
┌────────────────────────┐       ┌─────────────────────┐
│  Máy nhân viên         │       │  HRMS Backend       │
│                        │       │  (Node.js)          │
│  ┌──────────────────┐  │       │                     │
│  │ Chrome Extension │──┼──────>│ GET /rules          │  Lấy blacklist
│  │ (HRMS Web Filter)│  │       │ POST /logs          │  Gửi nhật ký
│  │                  │<─┼───────│                     │
│  │ Chặn URL + Log   │  │       └─────────┬───────────┘
│  └──────────────────┘  │                 │
└────────────────────────┘       ┌─────────▼───────────┐
                                 │  HRMS Frontend      │
                                 │  (React - Admin)    │
                                 │                     │
                                 │  Quản lý Rules      │
                                 │  Xem Logs & Stats   │
                                 └─────────────────────┘
```

**Luồng hoạt động:**
1. Admin vào HRMS Frontend → Tab "Bảo mật Mạng" → Thêm URL vào Blacklist (VD: `*facebook.com*`)
2. Admin có thể tick chọn nhân viên được MIỄN TRỪ (exemption) cho từng URL
3. Extension trên máy nhân viên tự động tải về danh sách Blacklist mỗi 5 phút
4. Khi nhân viên mở `facebook.com` → Extension so khớp Regex → **CHẶN** + redirect sang trang cảnh báo
5. Mọi hành vi truy cập (cả bị chặn lẫn hợp lệ) đều được gửi Log về Backend kèm thông tin OS/Browser/IP
6. Admin xem lại Log + Thống kê (bao nhiêu lần bị chặn, bao nhiêu lần hợp lệ) trên giao diện

---

## 2. Hướng dẫn cài đặt Extension

### Bước 1: Mở Chrome Extensions
Mở trình duyệt Chrome/Edge → Gõ vào thanh địa chỉ:
```
chrome://extensions
```

### Bước 2: Bật Developer Mode
Bật công tắc **"Developer mode"** ở góc trên bên phải.

### Bước 3: Load Extension
Nhấn **"Load unpacked"** → Chọn thư mục `d:\hrms4.0\hrms-extension`

### Bước 4: Đăng nhập
Click vào icon Extension trên thanh công cụ → Nhập email/mật khẩu nhân viên → Nhấn "Đăng nhập"

**Sau khi đăng nhập thành công:**
- Extension sẽ tự động tải danh sách URL bị chặn từ HRMS Backend
- Mọi trang web nhân viên truy cập sẽ được kiểm tra và ghi log
- Nếu truy cập URL bị chặn → Chuyển hướng sang trang cảnh báo

---

## 3. Cấu trúc thư mục Extension

```
hrms-extension/
├── manifest.json      # Cấu hình Chrome Extension (Manifest V3)
├── background.js      # Service Worker - chạy ngầm, chặn URL, gửi log
├── popup.html         # Giao diện popup khi click icon extension
├── popup.js           # Logic đăng nhập/đăng xuất
├── blocked.html       # Trang cảnh báo khi bị chặn
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 4. Wildcard Pattern → Regex

| Pattern Admin nhập       | Regex tạo ra               | Kết quả                         |
|--------------------------|----------------------------|----------------------------------|
| `*facebook.com*`         | `.*facebook\.com.*`        | Chặn mọi URL chứa facebook.com  |
| `*youtube.com/*`         | `.*youtube\.com\/.*`       | Chặn mọi URL trên Youtube       |
| `https://web.facebook.com` | `https:\/\/web\.facebook\.com` | Chặn chính xác URL này     |
| `*tiktok*`               | `.*tiktok.*`               | Chặn mọi URL chứa từ "tiktok"   |

---

## 5. Thông tin Log ghi nhận

Mỗi lần nhân viên truy cập web, Extension gửi về Backend các thông tin:

| Trường       | Ví dụ                    | Nguồn dữ liệu          |
|-------------|--------------------------|--------------------------|
| employeeId  | `uuid-xxx`               | Từ JWT token đăng nhập   |
| url         | `https://facebook.com/`  | Từ `chrome.webNavigation`|
| action      | `blocked` / `allowed`    | Kết quả so khớp Regex    |
| os          | `Windows 10/11`          | Parse `navigator.userAgent` |
| browser     | `Chrome` / `Edge`        | Parse `navigator.userAgent` |
| device      | `Desktop`                | Mặc định                 |
| ipAddress   | `192.168.1.100`          | Server lấy từ `req.ip`   |
