# 🗺️ BẢN ĐỒ CÂY CHỨC NĂNG & HỆ THỐNG FILE DỰ ÁN HRMS 4.0

> **Tài liệu hệ thống:** Phân loại toàn bộ các file trong dự án HRMS 4.0 theo từng phân hệ chức năng (Features/Modules), trình bày dưới dạng sơ đồ cây (Tree Menu), phân định rõ ràng giữa **Frontend (FE)**, **Backend (BE)**, **Database Models (DB)** và **Browser Extension**.

---

## 📑 MỤC LỤC CÁC PHÂN HỆ CHỨC NĂNG

- [1. Phân hệ Xác thực & Phân quyền (Auth & RBAC)](#1-phân-hệ-xác-thực--phân-quyền-auth--rbac)
- [2. Phân hệ Quản lý Nhân sự & Hồ sơ (Employees & Departments)](#2-phân-hệ-quản-lý-nhân-sự--hồ-sơ-employees--departments)
- [3. Phân hệ Chấm công & Nhận diện khuôn mặt (Attendance & Geofencing)](#3-phân-hệ-chấm-công--nhận-diện-khuôn-mặt-attendance--geofencing)
- [4. Phân hệ Quản lý Nghỉ phép (Leave Management)](#4-phân-hệ-quản-lý-nghỉ-phép-leave-management)
- [5. Phân hệ Tiền lương, Ứng lương & Cổng SePay (Payroll & Finance)](#5-phân-hệ-tiền-lương-ứng-lương--cổng-sepay-payroll--finance)
- [6. Phân hệ Đánh giá Hiệu suất (KPI / Performance) - [Tạm tắt]](#6-phân-hệ-đánh-giá-hiệu-suất-kpi--performance---tạm-tắt)
- [7. Phân hệ Tiếp nhận Nhân sự mới (Onboarding Flow & AI Welcome)](#7-phân-hệ-tiếp-nhận-nhân-sự-mới-onboarding-flow--ai-welcome)
- [8. Phân hệ Trợ lý Trí tuệ Nhân tạo (AI Chatbot & ChatOps)](#8-phân-hệ-trợ-lý-trí-tuệ-nhân-tạo-ai-chatbot--chatops)
- [9. Phân hệ Công cụ AI An toàn & Thẩm định Giấy tờ (Security AI)](#9-phân-hệ-công-cụ-ai-an-toàn--thẩm-định-giấy-tờ-security-ai)
- [10. Phân hệ Quản lý Tài liệu Doanh nghiệp (Document Management)](#10-phân-hệ-quản-lý-tài-liệu-doanh-nghiệp-document-management)
- [11. Phân hệ Chat Nội bộ Thời gian thực (Internal Chat 1-1)](#11-phân-hệ-chat-nội-bộ-thời-gian-thực-internal-chat-1-1)
- [12. Phân hệ Tích hợp Telegram Bot (@hrms40_Bot)](#12-phân-hệ-tích-hợp-telegram-bot-hrms40_bot)
- [13. Phân hệ Lịch công việc & Hẹn giờ Sự kiện (Events & Calendar)](#13-phân-hệ-lịch-công-việc--hẹn-giờ-sự-kiện-events--calendar)
- [14. Phân hệ Quản lý Chính sách & Văn bản Nội bộ (Policy Management)](#14-phân-hệ-quản-lý-chính-sách--văn-bản-nội-bộ-policy-management)
- [15. Phân hệ Giám sát Web & Chrome Extension (Web Filter & Security)](#15-phân-hệ-giám-sát-web--chrome-extension-web-filter--security)
- [16. Phân hệ Dashboard & Báo cáo Thống kê (Analytics & Charts)](#16-phân-hệ-dashboard--báo-cáo-thống-kê-analytics--charts)
- [17. Phân hệ Bảng tin Xã hội Doanh nghiệp (Social Feed)](#17-phân-hệ-bảng-tin-xã-hội-doanh-nghiệp-social-feed)
- [18. Phân hệ Cài đặt Hệ thống & Menu Navigation (Settings & Menus)](#18-phân-hệ-cài-đặt-hệ-thống--menu-navigation-settings--menus)
- [19. Khung Nền tảng Ứng dụng, UI Kit & Hạ tầng (Core Framework & Shared UI)](#19-khung-nền-tảng-ứng-dụng-ui-kit--hạ-tầng-core-framework--shared-ui)

---

## 1. Phân hệ Xác thực & Phân quyền (Auth & RBAC)

### 📌 Nghiệp vụ chính
- Đăng nhập bảo mật với JWT Token, hỗ trợ Captcha chống brute-force (svg-captcha).
- Đăng ký tài khoản nhân viên mới, mã hóa mật khẩu bằng bcrypt.
- Quên mật khẩu / đổi mật khẩu xác minh qua mã OTP gửi qua Email hoặc Telegram.
- Phân quyền theo Role-Based Access Control: `admin`, `hr_manager`, `department_manager`, `employee`.
- Quản lý vai trò (Role CRUD) và gán quyền chi nhánh/phòng ban.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 1. AUTH & RBAC
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/auth/Login.tsx
│   ├── 📄 src/features/auth/Register.tsx
│   ├── 📄 src/features/security/RbactTab.tsx
│   ├── 🗃️ src/stores/authStore.ts
│   ├── 🗃️ src/stores/useAuthStore.ts
│   ├── 🗃️ src/stores/usePermissionStore.ts
│   ├── 🪝 src/hooks/usePermission.ts
│   ├── 🔌 src/services/auth.ts
│   └── 🔌 src/services/permission.ts
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/authController.js
│   ├── 🎮 controllers/permissionController.js
│   ├── 🛣️ routes/authRoutes.js
│   ├── 🛣️ routes/roleRoutes.js
│   ├── 🛣️ routes/permissionRoutes.js
│   ├── 🛡️ middleware/authMiddleware.js
│   ├── 🛡️ middleware/roleMiddleware.js
│   ├── 🛡️ middleware/permissionMiddleware.js
│   ├── 💼 services/auth/authService.js
│   ├── 💼 services/auth/authStrategy.js
│   ├── 💼 services/auth/tokenService.js
│   ├── 💼 services/auth/authNotificationFacade.js
│   └── 📌 constants/roles.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/Employee.js (username, password_hash, role_id)
    ├── 🧱 models/Role.js (id, name, description)
    ├── 🧱 models/EmployeeRole.js (bảng liên kết nhiều-nhiều)
    ├── 🧱 models/DepartmentPermission.js
    └── 🧱 models/EmployeePermission.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`Login.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/auth/Login.tsx) | Giao diện đăng nhập, xử lý captcha, ghi nhớ token |
| **FE Page** | [`Register.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/auth/Register.tsx) | Form đăng ký tài khoản nhân sự mới |
| **FE Component** | [`RbactTab.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/security/RbactTab.tsx) | Giao diện quản lý vai trò và phân quyền trong tab Bảo mật |
| **FE Store** | [`useAuthStore.ts`](file:///d:/hrms4.0/hrms-frontend/src/stores/useAuthStore.ts) | Quản lý trạng thái user hiện tại, token, quyền hạn (Zustand) |
| **FE Store** | [`usePermissionStore.ts`](file:///d:/hrms4.0/hrms-frontend/src/stores/usePermissionStore.ts) | Lưu trữ và kiểm tra danh sách quyền phân cấp |
| **FE Service** | [`auth.ts`](file:///d:/hrms4.0/hrms-frontend/src/services/auth.ts) | Gọi API `/api/auth/login`, `/register`, `/captcha`, `/otp` |
| **FE Service** | [`permission.ts`](file:///d:/hrms4.0/hrms-frontend/src/services/permission.ts) | Gọi API phân quyền và role |
| **BE Controller** | [`authController.js`](file:///d:/hrms4.0/hrms-backend/controllers/authController.js) | Điều phối login, refresh token, gửi OTP, đổi pass |
| **BE Controller** | [`permissionController.js`](file:///d:/hrms4.0/hrms-backend/controllers/permissionController.js) | Quản lý vai trò, gán quyền role/phòng ban |
| **BE Route** | [`authRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/authRoutes.js) | Định nghĩa các endpoint xác thực |
| **BE Middleware** | [`authMiddleware.js`](file:///d:/hrms4.0/hrms-backend/middleware/authMiddleware.js) | Kiểm tra tính hợp lệ của JWT Bearer Token |
| **BE Middleware** | [`roleMiddleware.js`](file:///d:/hrms4.0/hrms-backend/middleware/roleMiddleware.js) | Chặn truy cập theo quyền: `admin`, `hr_manager`... |

---

## 2. Phân hệ Quản lý Nhân sự & Hồ sơ (Employees & Departments)

### 📌 Nghiệp vụ chính
- Quản lý danh sách nhân viên toàn công ty, tìm kiếm, lọc theo trạng thái/phòng ban.
- Xem chi tiết hồ sơ nhân sự, hợp đồng, chức vụ, mức lương cơ bản, thông tin ngân hàng.
- Quản lý phòng ban (CRUD phòng ban, điều chuyển nhân sự).
- Trang cá nhân (Profile) của nhân viên tự cập nhật thông tin và đổi avatar.
- Đăng ký và cập nhật vector khuôn mặt (Face ID) bảo mật có mã hóa AES.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 2. EMPLOYEES & DEPARTMENTS
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/employees/EmployeeList.tsx
│   ├── 📄 src/features/employees/EmployeeDetail.tsx
│   ├── 📄 src/features/profile/Profile.tsx
│   ├── 📄 src/features/settings/DepartmentTab.tsx
│   ├── 🧩 src/components/ui/Avatar/Avatar.tsx
│   ├── 🧩 src/components/ui/FaceScanner/FaceScanner.tsx
│   └── 🪝 src/hooks/useFaceRecognition.ts
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🛣️ routes/employeeRoutes.js
│   ├── 🎮 controllers/departmentController.js
│   ├── 🛣️ routes/departmentRoutes.js
│   ├── 🎮 controllers/uploadController.js
│   ├── 🛣️ routes/uploadRoutes.js
│   ├── 💼 services/faceVectorService.js
│   └── 💼 services/cryptoService.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/Employee.js
    └── 🧱 models/Department.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`EmployeeList.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/employees/EmployeeList.tsx) | Danh sách nhân viên dạng bảng, bộ lọc phòng ban, tìm kiếm |
| **FE Page** | [`EmployeeDetail.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/employees/EmployeeDetail.tsx) | Trang chi tiết thông tin hồ sơ nhân viên, lương, hợp đồng |
| **FE Page** | [`Profile.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/profile/Profile.tsx) | Trang xem & sửa hồ sơ cá nhân của nhân viên đang đăng nhập |
| **FE Component** | [`DepartmentTab.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/settings/DepartmentTab.tsx) | Quản lý danh mục phòng ban (Thêm, Sửa, Xóa phòng ban) |
| **FE Component** | [`FaceScanner.tsx`](file:///d:/hrms4.0/hrms-frontend/src/components/ui/FaceScanner/FaceScanner.tsx) | Component bật camera quét khuôn mặt qua Face-API.js |
| **FE Hook** | [`useFaceRecognition.ts`](file:///d:/hrms4.0/hrms-frontend/src/hooks/useFaceRecognition.ts) | Hook tải model Face-API, trích xuất 128-dimensional vector |
| **BE Route** | [`employeeRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/employeeRoutes.js) | Xử lý CRUD nhân viên, cập nhật Face vector, upload avatar |
| **BE Controller** | [`departmentController.js`](file:///d:/hrms4.0/hrms-backend/controllers/departmentController.js) | Xử lý CRUD phòng ban, lấy danh sách nhân viên theo phòng |
| **BE Service** | [`faceVectorService.js`](file:///d:/hrms4.0/hrms-backend/services/faceVectorService.js) | So sánh độ tương đồng cosine similarity giữa 2 vector khuôn mặt |
| **BE Service** | [`cryptoService.js`](file:///d:/hrms4.0/hrms-backend/services/cryptoService.js) | Mã hóa AES-256 vector khuôn mặt trước khi lưu vào DB |
| **DB Model** | [`Employee.js`](file:///d:/hrms4.0/hrms-backend/models/Employee.js) | Bảng dữ liệu `Employees` (thông tin cá nhân, face_vector, lương) |
| **DB Model** | [`Department.js`](file:///d:/hrms4.0/hrms-backend/models/Department.js) | Bảng dữ liệu `Departments` |

---

## 3. Phân hệ Chấm công & Nhận diện khuôn mặt (Attendance & Geofencing)

### 📌 Nghiệp vụ chính
- Check-in 2 bước an toàn: Bước 1 quét khuôn mặt (Face-API client-side) -> so khớp vector với ngưỡng 0.6; Bước 2 xác minh GPS Geofencing (bán kính văn phòng qua công thức Haversine).
- Tự động cấp `verifyToken` tạm thời (2 phút) để xác thực luồng chấm công.
- Check-out: ghi nhận giờ ra, tự động tính tổng giờ công và đánh dấu `Present`, `Late`, `Half-day`.
- Xem lịch sử chấm công dạng bảng và dạng Lịch tương tác (Attendance Calendar).
- Tạo đơn giải trình chấm công khi đi muộn, về sớm hoặc quên chấm công.
- Tự động kiểm tra Extension Heartbeat trước khi cho phép chấm công (theo thiết lập Role).

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 3. ATTENDANCE & GEOFENCING
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/attendance/Attendance.tsx
│   ├── 📄 src/features/attendance/AttendanceCalendar.tsx
│   ├── 📄 src/features/attendance/ExplanationForm.tsx
│   ├── 🔌 src/services/attendance.ts
│   ├── 🔧 src/utils/checkExtension.ts
│   └── 🧩 src/components/ui/FaceScanner/FaceScanner.tsx
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/attendanceController.js
│   ├── 🛣️ routes/attendanceRoutes.js
│   ├── 💼 services/faceVectorService.js
│   ├── 💼 services/cryptoService.js
│   └── 🔧 utils/geoUtils.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/Attendance.js
    ├── 🧱 models/AttendanceExplanation.js
    └── 🧱 models/Setting.js (office_lat, office_lng, geofence_radius)
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`Attendance.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/attendance/Attendance.tsx) | Giao diện chấm công camera, kiểm tra vị trí GPS, nút Check-in/Check-out |
| **FE Page** | [`AttendanceCalendar.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/attendance/AttendanceCalendar.tsx) | Lịch hiển thị trực quan ngày đi làm, đi trễ, nghỉ phép theo tháng |
| **FE Component** | [`ExplanationForm.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/attendance/ExplanationForm.tsx) | Form gửi đơn giải trình lý do đi trễ, quên chấm |
| **FE Service** | [`attendance.ts`](file:///d:/hrms4.0/hrms-frontend/src/services/attendance.ts) | Gọi API chấm công, kiểm tra vị trí GPS, gửi đơn giải trình |
| **FE Util** | [`checkExtension.ts`](file:///d:/hrms4.0/hrms-frontend/src/utils/checkExtension.ts) | Ping Chrome Extension để kiểm tra trạng thái hoạt động |
| **BE Controller** | [`attendanceController.js`](file:///d:/hrms4.0/hrms-backend/controllers/attendanceController.js) | Xử lý verify face, check-in, check-out, duyệt giải trình |
| **BE Route** | [`attendanceRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/attendanceRoutes.js) | Định nghĩa routes `/api/attendance` |
| **BE Util** | [`geoUtils.js`](file:///d:/hrms4.0/hrms-backend/utils/geoUtils.js) | Tính khoảng cách thực tế giữa tọa độ GPS user và văn phòng |
| **DB Model** | [`Attendance.js`](file:///d:/hrms4.0/hrms-backend/models/Attendance.js) | Bảng dữ liệu `Attendances` (giờ vào, giờ ra, số giờ làm, trạng thái) |
| **DB Model** | [`AttendanceExplanation.js`](file:///d:/hrms4.0/hrms-backend/models/AttendanceExplanation.js) | Bảng dữ liệu `AttendanceExplanations` (giải trình) |

---

## 4. Phân hệ Quản lý Nghỉ phép (Leave Management)

### 📌 Nghiệp vụ chính
- Nhân viên tạo đơn xin nghỉ phép (Annual Leave, Sick Leave, Personal Leave). Hỗ trợ nghỉ cả ngày hoặc nửa ngày (Morning/Afternoon).
- Quản lý / HR duyệt hoặc từ chối đơn xin nghỉ phép có lý do phản hồi.
- Tự động tính toán số ngày nghỉ trừ vào quỹ phép năm (`leave_balance`).
- Tích hợp tạo đơn nhanh thông qua Chatbot AI (ChatOps mini-form).

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 4. LEAVE MANAGEMENT
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/leave/Leave.tsx
│   ├── 🧩 src/features/chat/components/MiniLeaveForm.tsx
│   └── 🔌 src/services/leave.ts
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/leaveController.js
│   ├── 🛣️ routes/leaveRoutes.js
│   └── 🔧 utils/leaveUtils.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/Leave.js
    └── 🧱 models/Employee.js (`leave_balance`)
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`Leave.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/leave/Leave.tsx) | Quản lý danh sách đơn xin phép, tạo đơn mới, duyệt đơn |
| **FE Component** | [`MiniLeaveForm.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/chat/components/MiniLeaveForm.tsx) | Form xin nghỉ phép rút gọn nhúng trực tiếp trong chat AI |
| **FE Service** | [`leave.ts`](file:///d:/hrms4.0/hrms-frontend/src/services/leave.ts) | Gọi API tạo đơn, lấy lịch sử nghỉ, duyệt/hủy đơn |
| **BE Controller** | [`leaveController.js`](file:///d:/hrms4.0/hrms-backend/controllers/leaveController.js) | Xử lý logic tạo đơn, trừ phép, quản lý duyệt đơn |
| **BE Route** | [`leaveRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/leaveRoutes.js) | Các endpoint `/api/leaves` |
| **BE Util** | [`leaveUtils.js`](file:///d:/hrms4.0/hrms-backend/utils/leaveUtils.js) | Tính số ngày công nghỉ thực tế (loại bỏ Thứ 7, CN, tính nửa ngày) |
| **DB Model** | [`Leave.js`](file:///d:/hrms4.0/hrms-backend/models/Leave.js) | Bảng dữ liệu `Leaves` (ngày bắt đầu, kết thúc, trạng thái PENDING/APPROVED) |

---

## 5. Phân hệ Tiền lương, Ứng lương & Cổng SePay (Payroll & Finance)

### 📌 Nghiệp vụ chính
- Cấu hình mức lương cơ bản, phụ cấp ăn trưa, xăng xe, trách nhiệm cho nhân viên.
- Tính lương tự động theo chu kỳ tháng: tính toán ngày công thực tế từ bảng Attendance, trừ ngày nghỉ không lương, khấu trừ bảo hiểm (BHXH, BHYT) và thuế TNCN.
- Phiếu lương điện tử (Payslip) chi tiết, hỗ trợ xuất báo cáo file Excel (.xlsx).
- Nhân viên tạo yêu cầu ứng lương (Advance Request) giữa tháng, quản lý phê duyệt và hệ thống tự động cấn trừ vào bảng lương cuối tháng.
- Tích hợp cổng thanh toán SePay (Webhook tự động xác nhận chuyển khoản lương).
- Gửi phiếu lương tự động qua Email kèm file đính kèm.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 5. PAYROLL & FINANCE
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/payroll/Payroll.tsx
│   └── 📄 src/features/payroll/AdvanceRequest.tsx
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/payrollController.js
│   ├── 🎮 controllers/advanceRequestController.js
│   ├── 🎮 controllers/sepayController.js
│   ├── 🛣️ routes/payrollRoutes.js
│   ├── 🛣️ routes/advanceRequestRoutes.js
│   ├── 🛣️ routes/sepayRoutes.js
│   └── 💼 services/emailService.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/Payroll.js
    ├── 🧱 models/Salary.js
    └── 🧱 models/AdvanceRequest.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`Payroll.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/payroll/Payroll.tsx) | Bảng tính lương tổng thể, xem phiếu lương cá nhân, xuất Excel |
| **FE Page** | [`AdvanceRequest.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/payroll/AdvanceRequest.tsx) | Giao diện tạo và duyệt yêu cầu ứng trước lương |
| **BE Controller** | [`payrollController.js`](file:///d:/hrms4.0/hrms-backend/controllers/payrollController.js) | Thuật toán tính lương tự động, xuất file Excel bằng `exceljs` |
| **BE Controller** | [`advanceRequestController.js`](file:///d:/hrms4.0/hrms-backend/controllers/advanceRequestController.js) | Quản lý vòng đời yêu cầu ứng lương |
| **BE Controller** | [`sepayController.js`](file:///d:/hrms4.0/hrms-backend/controllers/sepayController.js) | Webhook nhận thanh toán SePay và giả lập thanh toán ngân hàng |
| **BE Route** | [`payrollRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/payrollRoutes.js) | Tuyến đường quản lý bảng lương `/api/payroll` |
| **BE Route** | [`advanceRequestRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/advanceRequestRoutes.js) | Tuyến đường yêu cầu ứng lương `/api/advance-requests` |
| **BE Route** | [`sepayRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/sepayRoutes.js) | Tuyến đường Webhook SePay `/api/sepay` |
| **DB Model** | [`Payroll.js`](file:///d:/hrms4.0/hrms-backend/models/Payroll.js) | Bảng dữ liệu `Payrolls` (thực lĩnh, ngày công, khấu trừ) |
| **DB Model** | [`Salary.js`](file:///d:/hrms4.0/hrms-backend/models/Salary.js) | Bảng thiết lập `Salaries` (lương cơ sở, phụ cấp cố định) |
| **DB Model** | [`AdvanceRequest.js`](file:///d:/hrms4.0/hrms-backend/models/AdvanceRequest.js) | Bảng dữ liệu `AdvanceRequests` |

---

## 6. Phân hệ Đánh giá Hiệu suất (KPI / Performance) - [Tạm tắt]

> ⚠️ **Trạng thái:** Tạm ngừng kích hoạt theo yêu cầu của người dùng (`"tiếp tục nhưng phần kpi tôi đang không muón sử dụng"`). Đã tháo route khỏi `server.js` và `Router.tsx`.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 6. KPI / PERFORMANCE (INACTIVE)
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/kpiController.js
│   └── 🛣️ routes/kpiRoutes.js
└── 🗄️ DATABASE MODELS
    └── 🧱 models/KPI.js
```

---

## 7. Phân hệ Tiếp nhận Nhân sự mới (Onboarding Flow & AI Welcome)

### 📌 Nghiệp vụ chính
- Wizard hướng dẫn nhân viên mới: nhập thông tin bổ sung, tải tài liệu cá nhân (CCCD, bằng cấp), hợp đồng lao động điện tử.
- Socket.IO tự động phát hiện nhân viên mới tạo tài khoản trong vòng 24 giờ khi họ kết nối vào hệ thống.
- Kích hoạt bot AI chào đón và hướng dẫn làm quen văn hóa doanh nghiệp.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 7. ONBOARDING & AI WELCOME
├── 🖥️ FRONTEND (hrms-frontend)
│   └── 📄 src/features/onboarding/Onboarding.tsx
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/onboardingController.js
│   ├── 🛣️ routes/onboardingRoutes.js
│   └── ⚡ socket.js (Check new employee < 24h & auto-welcome)
└── 🗄️ DATABASE MODELS
    └── 🧱 models/OnboardingRecord.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`Onboarding.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/onboarding/Onboarding.tsx) | Giao diện các bước tiếp nhận nhân sự mới (Form nhiều bước) |
| **BE Controller** | [`onboardingController.js`](file:///d:/hrms4.0/hrms-backend/controllers/onboardingController.js) | Lưu thông tin onboarding, đổi trạng thái hoàn thành |
| **BE Route** | [`onboardingRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/onboardingRoutes.js) | Tuyến đường `/api/onboarding` |
| **BE Realtime** | [`socket.js`](file:///d:/hrms4.0/hrms-backend/socket.js) | Lắng nghe kết nối socket, bắn thông điệp chào mừng tự động |
| **DB Model** | [`OnboardingRecord.js`](file:///d:/hrms4.0/hrms-backend/models/OnboardingRecord.js) | Bảng dữ liệu lưu tiến trình onboarding |

---

## 8. Phân hệ Trợ lý Trí tuệ Nhân tạo (AI Chatbot & ChatOps)

### 📌 Nghiệp vụ chính
- Widget AI Chatbot cố định ở góc màn hình, hỗ trợ nhân viên 24/7 bằng ngôn ngữ tự nhiên.
- Tích hợp mô hình Google Gemini với **11 Tools Function Calling**:
  - Tra cứu ngày phép còn lại, số giờ chấm công, phiếu lương tháng gần nhất.
  - Tạo đơn xin nghỉ phép, giải trình chấm công trực tiếp từ câu lệnh chat.
  - Lên lịch hẹn và đặt lịch gửi email tự động.
  - Tra cứu thời tiết realtime (OpenWeatherMap API) và tin tức doanh nghiệp.
- **ChatOps:** Trả về JSON UI blocks để Frontend tự render Mini Form hoặc Biểu đồ thống kê (Recharts) ngay trong khung chat.
- Hàng đợi xử lý tác vụ AI không đồng bộ bằng Redis và Bull Queue (`aiQueueService`).

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 8. AI CHATBOT & CHATOPS
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 🧩 src/features/chat/ChatbotWidget.tsx
│   ├── 🧩 src/components/ui/Chatbot/ChatbotWidget.tsx
│   ├── 📊 src/features/chat/components/ChatChart.tsx
│   └── 📝 src/features/chat/components/MiniLeaveForm.tsx
├── ⚙️ BACKEND (hrms-backend)
│   ├── 💼 services/aiService.js (11 Tools Function Calling)
│   ├── 💼 services/aiQueueService.js (Bull Queue + Redis)
│   ├── 🔌 config/redisClient.js
│   └── 🌐 server.js (`/api/ai/chat`)
└── 🗄️ DATABASE & REDIS
    ├── ⚡ Redis (Key: OTP, AI task cache)
    └── 🧱 models/Employee.js, Leave.js, Attendance.js, Payroll.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Component** | [`ChatbotWidget.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/chat/ChatbotWidget.tsx) | Khung chat AI nổi, giao diện tin nhắn, gõ lệnh, hiển thị markdown |
| **FE Component** | [`ChatChart.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/chat/components/ChatChart.tsx) | Component vẽ biểu đồ Recharts khi AI trả về kết quả ChatOps |
| **FE Component** | [`MiniLeaveForm.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/chat/components/MiniLeaveForm.tsx) | Form xin nghỉ phép render ngay trong luồng chat |
| **BE Service** | [`aiService.js`](file:///d:/hrms4.0/hrms-backend/services/aiService.js) | Lõi Gemini GenAI SDK, system prompt HR, định nghĩa 11 Function tools |
| **BE Service** | [`aiQueueService.js`](file:///d:/hrms4.0/hrms-backend/services/aiQueueService.js) | Quản lý hàng đợi Bull Queue, chống nghẽn request khi nhiều user chat |
| **BE Config** | [`redisClient.js`](file:///d:/hrms4.0/hrms-backend/config/redisClient.js) | Kết nối Redis Server |

---

## 9. Phân hệ Công cụ AI An toàn & Thẩm định Giấy tờ (Security AI)

### 📌 Nghiệp vụ chính
- **Scam Detector:** Nhân viên paste nội dung email, tin nhắn đáng ngờ -> AI phân tích câu chữ, ngữ cảnh, đường link và chấm điểm mức độ nguy hiểm lừa đảo.
- **Document Verifier:** Tải ảnh giấy tờ tùy thân (CCCD/CMND, hợp đồng, bằng cấp) -> AI Vision quét và kiểm tra tính hợp lệ, phát hiện dấu hiệu chỉnh sửa/photoshop hoặc phôi giả.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 9. SECURITY AI TOOLS
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/ai-tools/AITools.tsx
│   ├── 🧩 src/features/ai-tools/ScamDetectorTab.tsx
│   └── 🧩 src/features/ai-tools/DocumentVerifierTab.tsx
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/securityAIController.js
│   ├── 🛣️ routes/securityAIRoutes.js
│   ├── 💼 services/aiService.js (`analyzeDocumentIntegrity`, `detectScamMessage`)
│   └── 🧪 test_doc.js
└── 🗄️ DATABASE MODELS
    └── 🧱 models/SecurityViolation.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`AITools.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/ai-tools/AITools.tsx) | Trang tổng hợp các công cụ AI bảo mật doanh nghiệp |
| **FE Tab** | [`ScamDetectorTab.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/ai-tools/ScamDetectorTab.tsx) | Nhập văn bản phân tích nguy cơ lừa đảo trực tuyến |
| **FE Tab** | [`DocumentVerifierTab.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/ai-tools/DocumentVerifierTab.tsx) | Upload ảnh giấy tờ và nhận xét tính xác thực từ AI |
| **BE Controller** | [`securityAIController.js`](file:///d:/hrms4.0/hrms-backend/controllers/securityAIController.js) | Tiếp nhận file ảnh / văn bản, gọi AI phân tích |
| **BE Route** | [`securityAIRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/securityAIRoutes.js) | Các endpoint `/api/security-ai` |

---

## 10. Phân hệ Quản lý Tài liệu Doanh nghiệp (Document Management)

### 📌 Nghiệp vụ chính
- Cấu trúc thư viện tài liệu theo cây danh mục phân cấp (Category Tree).
- Upload và lưu trữ tài liệu (PDF, Word, Ảnh), phân quyền xem theo phòng ban.
- Modal xem tài liệu trực tuyến (Document Viewer).
- **Hỏi đáp AI về tài liệu (`askAIDocument`):** Nhân viên mở tài liệu và đặt câu hỏi, AI đọc ngữ cảnh tài liệu và tóm tắt / trích xuất nội dung cần tìm.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 10. DOCUMENT MANAGEMENT
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/documents/pages/DocumentsPage.tsx
│   ├── 🧩 src/features/documents/components/CategoryTree.tsx
│   ├── 🧩 src/features/documents/components/DocumentList.tsx
│   ├── 🧩 src/features/documents/components/DocumentCard.tsx
│   ├── 🧩 src/features/documents/components/DocumentViewerModal.tsx
│   ├── 🧩 src/features/documents/components/UploadDocumentModal.tsx
│   ├── 🪝 src/features/documents/hooks/useDocuments.ts
│   ├── 🪝 src/features/documents/hooks/useDocumentCategories.ts
│   ├── 🔌 src/features/documents/api/documentApi.ts
│   └── 🔌 src/features/documents/api/documentCategoryApi.ts
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/documentController.js
│   ├── 🎮 controllers/documentCategoryController.js
│   ├── 🛣️ routes/documentRoutes.js
│   ├── 💼 services/aiService.js (`askAIDocument`)
│   └── 💼 services/elasticService.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/Document.js
    └── 🧱 models/DocumentCategory.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`DocumentsPage.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/documents/pages/DocumentsPage.tsx) | Trang quản lý tài liệu trung tâm |
| **FE Component** | [`CategoryTree.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/documents/components/CategoryTree.tsx) | Cây danh mục thư mục tài liệu |
| **FE Component** | [`DocumentList.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/documents/components/DocumentList.tsx) | Bảng danh sách các tài liệu trong danh mục |
| **FE Component** | [`DocumentViewerModal.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/documents/components/DocumentViewerModal.tsx) | Modal xem trước nội dung tài liệu và tích hợp hỏi đáp AI |
| **FE Component** | [`UploadDocumentModal.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/documents/components/UploadDocumentModal.tsx) | Modal tải tài liệu mới lên hệ thống |
| **BE Controller** | [`documentController.js`](file:///d:/hrms4.0/hrms-backend/controllers/documentController.js) | CRUD tài liệu, API hỏi AI về tài liệu |
| **BE Controller** | [`documentCategoryController.js`](file:///d:/hrms4.0/hrms-backend/controllers/documentCategoryController.js) | CRUD cây danh mục tài liệu |
| **DB Model** | [`Document.js`](file:///d:/hrms4.0/hrms-backend/models/Document.js) | Bảng dữ liệu lưu thông tin tệp, đường dẫn, kích thước |
| **DB Model** | [`DocumentCategory.js`](file:///d:/hrms4.0/hrms-backend/models/DocumentCategory.js) | Bảng lưu danh mục cha/con |

---

## 11. Phân hệ Chat Nội bộ Thời gian thực (Internal Chat 1-1)

### 📌 Nghiệp vụ chính
- Nhắn tin trực tiếp giữa các nhân viên trong nội bộ công ty tức thì qua Socket.IO.
- Hỗ trợ trích dẫn và trả lời tin nhắn (Reply context).
- Danh sách liên hệ nhân viên theo phòng ban, chỉ báo trạng thái online/offline.
- Lưu trữ lịch sử tin nhắn vào database.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 11. INTERNAL CHAT
├── 🖥️ FRONTEND (hrms-frontend)
│   └── 📄 src/features/chat/InternalChat.tsx
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/chatController.js
│   ├── 🛣️ routes/chatRoutes.js
│   └── ⚡ socket.js
└── 🗄️ DATABASE MODELS
    └── 🧱 models/Message.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`InternalChat.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/chat/InternalChat.tsx) | Màn hình chat trực tuyến, danh sách liên hệ bên trái, khung hội thoại bên phải |
| **BE Controller** | [`chatController.js`](file:///d:/hrms4.0/hrms-backend/controllers/chatController.js) | Lấy lịch sử tin nhắn, đánh dấu đã đọc |
| **BE Route** | [`chatRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/chatRoutes.js) | Tuyến đường `/api/chat` |
| **BE Realtime** | [`socket.js`](file:///d:/hrms4.0/hrms-backend/socket.js) | Xử lý sự kiện `send_message`, `receive_message`, phân luồng phòng riêng |
| **DB Model** | [`Message.js`](file:///d:/hrms4.0/hrms-backend/models/Message.js) | Bảng dữ liệu `Messages` (sender_id, receiver_id, content, is_read) |

---

## 12. Phân hệ Tích hợp Telegram Bot (@hrms40_Bot)

### 📌 Nghiệp vụ chính
- Liên kết tài khoản Telegram cá nhân với tài khoản nhân sự HRMS 4.0.
- Tra cứu tiện ích HR qua lệnh bot: `/salary` (phiếu lương), `/leave` (ngày phép), `/attendance` (chấm công), `/events` (lịch họp).
- Tạo đơn nghỉ phép trực tiếp ngay trên Telegram.
- Nhận thông báo Push tức thì khi: chấm công thành công, đơn nghỉ phép được duyệt, có email công việc mới.
- Hỏi đáp AI Gemini trực tiếp qua Telegram (xử lý qua hàng đợi `aiQueueService`).
- Tra cứu thời tiết, tin tức VNExpress RSS, tính lịch âm.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 12. TELEGRAM BOT
├── ⚙️ BACKEND (hrms-backend)
│   ├── 💼 services/telegramBot.js (Lõi điều khiển Bot, Polling IPv4)
│   ├── 💼 services/aiQueueService.js
│   └── 🌐 server.js
└── 🗄️ DATABASE MODELS
    └── 🧱 models/TelegramAccount.js (telegram_chat_id, employee_id, verified)
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **BE Service** | [`telegramBot.js`](file:///d:/hrms4.0/hrms-backend/services/telegramBot.js) | Quản lý vòng đời Telegram Bot, xử lý lệnh `/start`, menu inline keyboard, push notification |
| **DB Model** | [`TelegramAccount.js`](file:///d:/hrms4.0/hrms-backend/models/TelegramAccount.js) | Bảng dữ liệu liên kết giữa Chat ID Telegram và Nhân viên |

---

## 13. Phân hệ Lịch công việc & Hẹn giờ Sự kiện (Events & Calendar)

### 📌 Nghiệp vụ chính
- Lịch tương tác với FullCalendar: xem theo ngày, tuần, tháng, hỗ trợ kéo thả sự kiện.
- Tạo lịch họp, nhắc việc, sự kiện sinh nhật công ty, lịch gửi email.
- Hẹn giờ gửi email tự động (Scheduled Email): Cron Job backend quét mỗi phút và tự động kích hoạt gửi mail khi đến giờ hẹn.
- Đồng bộ lịch 2 chiều với Google Calendar API.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 13. EVENTS & CALENDAR
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/events/EventCalendar.tsx
│   └── 🧩 src/features/dashboard/QuickEventModal.tsx
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/scheduledEventController.js
│   ├── 🎮 controllers/googleCalendarController.js
│   ├── 🛣️ routes/scheduledEventRoutes.js
│   ├── 💼 services/emailService.js
│   ├── ⏰ server.js (Cron job quét ScheduledEvent mỗi phút)
│   └── 🔧 addGoogleToken.js
└── 🗄️ DATABASE MODELS
    └── 🧱 models/ScheduledEvent.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`EventCalendar.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/events/EventCalendar.tsx) | Giao diện toàn màn hình lịch công việc, tạo sự kiện |
| **FE Modal** | [`QuickEventModal.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/dashboard/QuickEventModal.tsx) | Modal tạo nhanh sự kiện / lịch hẹn ngay từ Dashboard |
| **BE Controller** | [`scheduledEventController.js`](file:///d:/hrms4.0/hrms-backend/controllers/scheduledEventController.js) | CRUD sự kiện và lịch gửi email tự động |
| **BE Controller** | [`googleCalendarController.js`](file:///d:/hrms4.0/hrms-backend/controllers/googleCalendarController.js) | Kết nối OAuth2 và đồng bộ Google Calendar |
| **BE Service** | [`emailService.js`](file:///d:/hrms4.0/hrms-backend/services/emailService.js) | Cấu hình Nodemailer gửi email SMTP |
| **DB Model** | [`ScheduledEvent.js`](file:///d:/hrms4.0/hrms-backend/models/ScheduledEvent.js) | Bảng dữ liệu `ScheduledEvents` |

---

## 14. Phân hệ Quản lý Chính sách & Văn bản Nội bộ (Policy Management)

### 📌 Nghiệp vụ chính
- Quản lý quy định, nội quy, chính sách phúc lợi công ty dưới định dạng rich-text Markdown.
- Phân quyền xem chính sách theo đối tượng / vai trò (ví dụ: chỉ Quản lý mới xem chính sách hoa hồng).
- Lên lịch phát hành tự động (Scheduled Publish): Cron Job quét định kỳ và tự động công bố chính sách.
- Bắn thông báo Realtime (Socket) + gửi Email đến nhân viên khi chính sách mới có hiệu lực.
- **Hỏi AI về chính sách (`askPolicy`):** Nhân viên mở chính sách và chat trực tiếp với AI để giải đáp thắc mắc về quyền lợi.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 14. POLICY MANAGEMENT & AI Q&A
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/policies/PolicyManagement.tsx
│   ├── 🧩 src/features/policies/PolicyAskAIModal.tsx
│   └── 🔌 src/services/policy.ts
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/policyController.js
│   ├── 🛣️ routes/policyRoutes.js
│   ├── 💼 services/aiService.js (`askPolicy`)
│   ├── 💼 services/emailService.js
│   └── ⏰ server.js (Cron job tự động xuất bản chính sách định kỳ)
└── 🗄️ DATABASE MODELS
    └── 🧱 models/PolicyDocument.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`PolicyManagement.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/policies/PolicyManagement.tsx) | Danh sách chính sách, bộ lọc, xem nội dung Markdown, nút tạo mới |
| **FE Modal** | [`PolicyAskAIModal.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/policies/PolicyAskAIModal.tsx) | Modal hỏi đáp AI giải thích chi tiết điều khoản chính sách |
| **FE Service** | [`policy.ts`](file:///d:/hrms4.0/hrms-frontend/src/services/policy.ts) | Gọi API CRUD chính sách và hỏi AI |
| **BE Controller** | [`policyController.js`](file:///d:/hrms4.0/hrms-backend/controllers/policyController.js) | Xử lý lưu trữ chính sách, phân quyền theo Role, hỏi AI |
| **DB Model** | [`PolicyDocument.js`](file:///d:/hrms4.0/hrms-backend/models/PolicyDocument.js) | Bảng dữ liệu `PolicyDocuments` |

---

## 15. Phân hệ Giám sát Web & Chrome Extension (Web Filter & Security)

### 📌 Nghiệp vụ chính
- Cài đặt **Chrome Extension (Manifest V3)** trên máy nhân viên.
- Extension gửi tín hiệu **Heartbeat** định kỳ về máy chủ xác nhận nhân viên đang bật giám sát.
- Ghi nhận lịch sử duyệt web (Web Access Log: URL, thời gian bắt đầu, thời lượng).
- Quản lý quy tắc lọc web (Whitelist / Blacklist) của công ty:
  - Tự động chặn các trang web cấm (cờ bạc, mạng xã hội, giải trí...).
  - Điều hướng người dùng sang trang cảnh báo bị chặn (`blocked.html`).
  - Hỗ trợ danh sách miễn trừ (Rule Exemption) cho các vị trí đặc thù.
- Ghi nhận và cảnh báo vi phạm an ninh hệ thống (Security Violations).

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 15. WEB FILTER & CHROME EXTENSION
├── 🧩 BROWSER EXTENSION (hrms-extension)
│   ├── 📄 manifest.json (Chrome Extension Manifest V3)
│   ├── ⚙️ background.js (Lắng nghe tab, gửi heartbeat, kiểm tra chặn URL)
│   ├── 📄 content.js (Content script phát hiện DOM)
│   ├── 🖼️ popup.html & popup.js (Giao diện popup đăng nhập & trạng thái)
│   └── 🛑 blocked.html (Trang hiển thị khi nhân viên truy cập URL bị cấm)
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/security/Security.tsx
│   ├── 🧩 src/features/security/WebFilterTab.tsx
│   ├── 🧩 src/features/security/SecurityViolationTab.tsx
│   ├── 🧩 src/features/security/BlockedWarning.tsx
│   ├── 🛡️ src/components/layout/SecurityViolationGuard.tsx
│   └── 🔧 src/utils/checkExtension.ts
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/webFilterController.js
│   └── 🛣️ routes/webFilterRoutes.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/WebFilterRule.js (URL pattern, action: BLOCK/ALLOW)
    ├── 🧱 models/WebAccessLog.js (nhật ký lướt web)
    ├── 🧱 models/ExtensionHeartbeat.js (nhịp tim extension)
    ├── 🧱 models/RuleExemption.js (danh sách miễn trừ)
    ├── 🧱 models/RoleExtensionRequirement.js (cấu hình bắt buộc theo role)
    ├── 🧱 models/EmployeeExtensionRequirement.js
    └── 🧱 models/SecurityViolation.js (nhật ký vi phạm)
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **Ext Background** | [`background.js`](file:///d:/hrms4.0/hrms-extension/background.js) | Chạy ngầm trong trình duyệt: gửi heartbeat mỗi 30s, kiểm tra tab URL với server |
| **Ext Popup** | [`popup.html`](file:///d:/hrms4.0/hrms-extension/popup.html) / [`popup.js`](file:///d:/hrms4.0/hrms-extension/popup.js) | Giao diện đăng nhập extension, hiển thị trạng thái kết nối máy chủ |
| **Ext Blocked** | [`blocked.html`](file:///d:/hrms4.0/hrms-extension/blocked.html) | Màn hình cảnh báo màu đỏ khi nhân viên vào web bị chặn |
| **FE Page** | [`Security.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/security/Security.tsx) | Trang trung tâm an ninh: quản lý URL cấm, log vi phạm, RBAC |
| **FE Component** | [`WebFilterTab.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/security/WebFilterTab.tsx) | CRUD danh sách website bị chặn / cho phép |
| **FE Component** | [`SecurityViolationTab.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/security/SecurityViolationTab.tsx) | Danh sách báo cáo vi phạm an toàn thông tin |
| **FE Guard** | [`SecurityViolationGuard.tsx`](file:///d:/hrms4.0/hrms-frontend/src/components/layout/SecurityViolationGuard.tsx) | Component kiểm tra và cảnh báo nếu phát hiện vi phạm |
| **BE Controller** | [`webFilterController.js`](file:///d:/hrms4.0/hrms-backend/controllers/webFilterController.js) | Nhận heartbeat, log web access, kiểm tra URL pattern |
| **BE Route** | [`webFilterRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/webFilterRoutes.js) | Các endpoint `/api/web-filter` |

---

## 16. Phân hệ Dashboard & Báo cáo Thống kê (Analytics & Charts)

### 📌 Nghiệp vụ chính
- **Admin Dashboard:** Tổng quan toàn bộ công ty: tổng nhân sự, số lượng đang có mặt, đi trễ, nghỉ phép, vắng mặt hôm nay. Tỷ lệ chuyên cần.
- **Employee Dashboard:** Dashboard cá nhân hóa cho nhân viên: giờ check-in hôm nay, số ngày phép còn lại, sự kiện sắp tới, widget thời tiết.
- Biểu đồ xu hướng chuyên cần 7 - 30 ngày (Recharts).
- Biểu đồ phân bổ nhân sự theo phòng ban (Pie Chart).
- Widget thời tiết thời gian thực qua OpenWeatherMap API.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 16. DASHBOARD & ANALYTICS
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/dashboard/AdminDashboard.tsx
│   ├── 📄 src/features/dashboard/EmployeeDashboard.tsx
│   ├── 🧩 src/components/ui/WeatherWidget/WeatherWidget.tsx
│   └── 🔌 src/services/analytics.ts
└── ⚙️ BACKEND (hrms-backend)
    ├── 🎮 controllers/analyticsController.js
    └── 🛣️ routes/analyticsRoutes.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`AdminDashboard.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/dashboard/AdminDashboard.tsx) | Dashboard quản trị viên với KPI Cards, biểu đồ chuyên cần, phân bố phòng ban |
| **FE Page** | [`EmployeeDashboard.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/dashboard/EmployeeDashboard.tsx) | Dashboard dành cho nhân viên (chấm công hôm nay, sự kiện, thời tiết) |
| **FE Widget** | [`WeatherWidget.tsx`](file:///d:/hrms4.0/hrms-frontend/src/components/ui/WeatherWidget/WeatherWidget.tsx) | Widget hiển thị nhiệt độ, thời tiết thực tế |
| **FE Service** | [`analytics.ts`](file:///d:/hrms4.0/hrms-frontend/src/services/analytics.ts) | Gọi API lấy số liệu thống kê tổng hợp |
| **BE Controller** | [`analyticsController.js`](file:///d:/hrms4.0/hrms-backend/controllers/analyticsController.js) | Tổng hợp thống kê nhân sự, chấm công, biểu đồ trend |
| **BE Route** | [`analyticsRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/analyticsRoutes.js) | Tuyến đường `/api/analytics` |

---

## 17. Phân hệ Bảng tin Xã hội Doanh nghiệp (Social Feed)

### 📌 Nghiệp vụ chính
- Bảng tin nội bộ tương tự mạng xã hội doanh nghiệp: đăng thông báo, bài viết chào đón thành viên mới, chia sẻ sự kiện, tương tác tương thân tương ái.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 17. SOCIAL FEED
├── 🖥️ FRONTEND (hrms-frontend)
│   └── 📄 src/features/social/SocialFeed.tsx
└── ⚙️ BACKEND (hrms-backend)
    └── 🌐 server.js / tích hợp bài đăng
```

---

## 18. Phân hệ Cài đặt Hệ thống & Menu Navigation (Settings & Menus)

### 📌 Nghiệp vụ chính
- **Quản lý Menu điều hướng:** Admin tùy biến thứ tự, ẩn/hiện, gán icon và phân quyền role cho từng mục menu trên Sidebar (`MenuManagementTab`).
- Cài đặt chung hệ thống: tọa độ GPS văn phòng (Latitude, Longitude), bán kính geofencing cho phép (mét).
- Feature Toggles: Bật/tắt nhanh các tính năng trên toàn hệ thống.
- Chế độ hiển thị Giao diện Sáng/Tối (Dark/Light Mode).
- Đa ngôn ngữ (Tiếng Việt / Tiếng Anh) qua `i18next`.

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 18. SETTINGS & MENU MANAGEMENT
├── 🖥️ FRONTEND (hrms-frontend)
│   ├── 📄 src/features/settings/Settings.tsx
│   ├── 🧩 src/features/settings/MenuManagementTab.tsx
│   ├── 🧩 src/features/settings/DepartmentTab.tsx
│   ├── 🗃️ src/stores/useMenuStore.ts
│   ├── 🗃️ src/stores/useSettingsStore.ts
│   ├── 🗃️ src/stores/useThemeStore.ts
│   └── 🌐 src/i18n/index.ts
├── ⚙️ BACKEND (hrms-backend)
│   ├── 🎮 controllers/menuController.js
│   ├── 🛣️ routes/menuRoutes.js
│   └── 🛣️ routes/settingsRoutes.js
└── 🗄️ DATABASE MODELS
    ├── 🧱 models/MenuItem.js
    └── 🧱 models/Setting.js
```

### 📋 Danh sách & Vai trò từng file
| Thành phần | Đường dẫn file | Vai trò / Trách nhiệm |
|---|---|---|
| **FE Page** | [`Settings.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/settings/Settings.tsx) | Trang cài đặt hệ thống (Menu, Phòng ban, Cấu hình Geofencing) |
| **FE Component** | [`MenuManagementTab.tsx`](file:///d:/hrms4.0/hrms-frontend/src/features/settings/MenuManagementTab.tsx) | Quản lý sắp xếp các menu của Sidebar |
| **FE Store** | [`useMenuStore.ts`](file:///d:/hrms4.0/hrms-frontend/src/stores/useMenuStore.ts) | Store quản lý danh sách menu động load từ server |
| **FE Store** | [`useSettingsStore.ts`](file:///d:/hrms4.0/hrms-frontend/src/stores/useSettingsStore.ts) | Store lưu trữ cấu hình hệ thống |
| **FE Store** | [`useThemeStore.ts`](file:///d:/hrms4.0/hrms-frontend/src/stores/useThemeStore.ts) | Store quản lý chế độ Dark / Light mode |
| **FE i18n** | [`index.ts`](file:///d:/hrms4.0/hrms-frontend/src/i18n/index.ts) | Cấu hình từ điển đa ngôn ngữ (vi, en) |
| **BE Controller** | [`menuController.js`](file:///d:/hrms4.0/hrms-backend/controllers/menuController.js) | CRUD cấu hình menu sidebar |
| **BE Route** | [`menuRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/menuRoutes.js) | Tuyến đường `/api/menus` |
| **BE Route** | [`settingsRoutes.js`](file:///d:/hrms4.0/hrms-backend/routes/settingsRoutes.js) | Tuyến đường `/api/settings` (lưu vị trí văn phòng) |
| **DB Model** | [`MenuItem.js`](file:///d:/hrms4.0/hrms-backend/models/MenuItem.js) | Bảng dữ liệu cấu hình các mục Menu |
| **DB Model** | [`Setting.js`](file:///d:/hrms4.0/hrms-backend/models/Setting.js) | Bảng cấu hình hệ thống (key-value) |

---

## 19. Khung Nền tảng Ứng dụng, UI Kit & Hạ tầng (Core Framework & Shared UI)

### 📌 Nghiệp vụ chính
- Shell ứng dụng chuẩn doanh nghiệp với Sidebar, Topbar, thông báo toàn cục, phím tắt tìm kiếm nhanh (Command Palette `Ctrl + K`).
- Bộ UI Kit tái sử dụng chuẩn hóa: Button, Input, Modal, Table, Tabs, Badge, Card, Avatar, Toast thông báo.
- Thiết lập kết nối WebSocket toàn cục lắng nghe thông báo và sự kiện tức thì.
- Server Express khởi tạo dịch vụ mạng IPv4 ép buộc (fix lỗi Timeout với các ISP tại Việt Nam), khởi tạo cơ sở dữ liệu Sequelize ORM.
- Docker Compose thiết lập môi trường triển khai 4 dịch vụ (Frontend, Backend, PostgreSQL, Redis).

### 🌳 Cây cấu trúc tệp tin (Tree View)
```text
📦 19. CORE FRAMEWORK & SHARED UI
├── 🖥️ FRONTEND CORE & LAYOUT (hrms-frontend)
│   ├── 🏠 src/App.tsx & main.tsx
│   ├── 🗺️ src/app/Router.tsx (Toàn bộ điều hướng ứng dụng)
│   ├── 🔌 src/app/Providers.tsx (React Query, i18n, Toast Provider)
│   ├── 🏛️ src/components/layout/AppShell.tsx (Khung layout chính)
│   ├── 📑 src/components/layout/Sidebar.tsx (Menu thanh bên)
│   ├── 🧭 src/components/layout/Topbar.tsx (Thanh công cụ trên cùng, Profile menu)
│   ├── 🔍 src/components/shared/CommandPalette.tsx (Tìm kiếm nhanh Ctrl+K)
│   ├── 🛡️ src/components/ErrorBoundary.tsx
│   ├── 🎨 src/index.css & App.css (Tailwind & CSS Tokens)
│   ├── 🔌 src/services/api.ts (Axios instance với Interceptor tự gắn JWT)
│   ├── ⚡ src/stores/useGlobalSocket.ts (Socket.IO client kết nối server)
│   ├── 🔔 src/stores/useToastStore.ts & src/components/ui/Toast/ToastProvider.tsx
│   ├── 🔧 src/utils/format.ts (Hàm format tiền tệ VND, ngày tháng)
│   └── 🧩 src/components/ui/
│       ├── Button/Button.tsx
│       ├── Input/Input.tsx
│       ├── Modal/Modal.tsx
│       ├── Table/Table.tsx
│       ├── Tabs/Tabs.tsx
│       ├── Badge/Badge.tsx
│       └── Card/Card.tsx
├── ⚙️ BACKEND CORE & INFRA (hrms-backend)
│   ├── 🚀 server.js (Entry point chính, DNS IPv4 Dispatcher, Cron Jobs, Routes)
│   ├── ⚡ socket.js (Socket.IO server xác thực JWT)
│   ├── 🔄 sync.js (Đồng bộ Sequelize models vào SQL Server / Postgres)
│   ├── 🔌 config/database.js (Khởi tạo kết nối Sequelize ORM)
│   ├── 🔌 config/redisClient.js (Khởi tạo kết nối Redis)
│   ├── 🗄️ models/index.js (Thiết lập quan hệ HasMany / BelongsTo giữa 30 models)
│   └── 🔧 utils/stringUtils.js
└── 🐳 DOCKER & TRIỂN KHAI
    ├── docker-compose.yml (Frontend Nginx, Node.js Backend, PostgreSQL 15, Redis 7)
    └── docker-compose.elastic.yml (Tích hợp Elasticsearch)
```

---

## 📊 BẢNG TỔNG HỢP TOÀN DỰ ÁN

| STT | Phân hệ / Module | Số file FE | Số file BE | Models DB | Trạng thái |
|:---:|---|:---:|:---:|:---:|:---:|
| 1 | Xác thực & Phân quyền (Auth & RBAC) | 9 | 13 | 5 | ✅ Đang hoạt động |
| 2 | Quản lý Nhân sự & Hồ sơ (Employees) | 7 | 7 | 2 | ✅ Đang hoạt động |
| 3 | Chấm công & Khuôn mặt (Attendance) | 6 | 5 | 3 | ✅ Đang hoạt động |
| 4 | Quản lý Nghỉ phép (Leave) | 3 | 3 | 2 | ✅ Đang hoạt động |
| 5 | Tiền lương & Cổng SePay (Payroll) | 2 | 7 | 3 | ✅ Đang hoạt động |
| 6 | Đánh giá Hiệu suất (KPI) | 0 | 2 | 1 | ⏸️ Tạm tắt theo yêu cầu |
| 7 | Tiếp nhận Nhân sự mới (Onboarding) | 1 | 3 | 1 | ✅ Đang hoạt động |
| 8 | Trợ lý AI (Chatbot & ChatOps) | 4 | 4 | Redis | ✅ Đang hoạt động |
| 9 | Công cụ AI An toàn (Security AI) | 3 | 4 | 1 | ✅ Đang hoạt động |
| 10 | Quản lý Tài liệu (Documents) | 10 | 5 | 2 | ✅ Đang hoạt động |
| 11 | Chat Nội bộ Realtime (Internal Chat) | 1 | 3 | 1 | ✅ Đang hoạt động |
| 12 | Tích hợp Telegram Bot (@hrms40_Bot) | 0 | 3 | 1 | ✅ Đang hoạt động (IPv4 Fix) |
| 13 | Lịch & Sự kiện (Events & Calendar) | 2 | 6 | 1 | ✅ Đang hoạt động |
| 14 | Quản lý Chính sách (Policy Management) | 3 | 5 | 1 | ✅ Đang hoạt động |
| 15 | Giám sát Web & Chrome Extension | 6 | 2 | 7 + Ext (6 files) | ✅ Đang hoạt động |
| 16 | Dashboard & Thống kê (Analytics) | 4 | 2 | - | ✅ Đang hoạt động |
| 17 | Bảng tin Xã hội (Social Feed) | 1 | 1 | - | ✅ Đang hoạt động |
| 18 | Cài đặt Hệ thống & Menu | 7 | 3 | 2 | ✅ Đang hoạt động |
| 19 | Khung Nền tảng, Shared UI & DevOps | 21 | 8 | Index + Docker | ✅ Đang hoạt động |

---
*Tài liệu được cập nhật tự động theo mã nguồn dự án HRMS 4.0.*
