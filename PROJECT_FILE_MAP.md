# 📁 BẢN ĐỒ FILE DỰ ÁN HRMS 4.0

> Tài liệu mô tả **tất cả các file** trong dự án, giải thích chức năng và vai trò của từng file.

---

## 📂 Gốc dự án (`hrms4.0/`)

| File | Chức năng |
|------|-----------|
| `docker-compose.yml` | Cấu hình Docker Compose triển khai 4 service: Frontend (Nginx), Backend (Node.js), PostgreSQL 15, Redis 7 |
| `docker-compose.elastic.yml` | Cấu hình Docker Compose mở rộng tích hợp Elasticsearch (tìm kiếm nâng cao) |
| `PROJECT_OVERVIEW.md` | Tài liệu tổng quan dự án: 19 module, 60 chức năng, ước lượng thời gian phát triển |
| `TAI_LIEU_DU_AN_HRMS.md` | Tài liệu kỹ thuật chi tiết: kiến trúc, công nghệ, thuật toán, cơ sở dữ liệu, sơ đồ mermaid |
| `HRMS_VIBE_PLAN.md` | Kế hoạch phát triển tổng thể (Vibe Plan) |
| `ATTENDANCE_HISTORY_PLAN.md` | Kế hoạch thiết kế tính năng lịch sử chấm công |
| `CHAT_SCALING_PLAN.md` | Kế hoạch mở rộng hệ thống chat nội bộ |
| `GEOFENCING_PLAN.md` | Kế hoạch thiết kế tính năng hàng rào ảo GPS |
| `REALTIME_ACCESS_LOG_PLAN.md` | Kế hoạch thiết kế log truy cập web realtime |
| `REDIS_CHAT_PLAN.md` | Kế hoạch tích hợp Redis cho chat |
| `WEB_FILTER_FEATURE.md` | Tài liệu tính năng Web Filter (chặn/lọc URL) |

---

## 📂 Backend (`hrms-backend/`)

### Gốc Backend

| File | Chức năng |
|------|-----------|
| `server.js` | **Entry point chính** — Khởi tạo Express app, đăng ký tất cả routes, khởi tạo Socket.IO, Telegram Bot, Bull Queue (AI), Cron Jobs (gửi email hẹn giờ, phát hành chính sách), và lắng nghe cổng server |
| `socket.js` | Cấu hình **Socket.IO** — Xác thực JWT khi kết nối, phân room theo User ID và `admin_room`, phát hiện nhân viên mới (< 24h) để AI gửi lời chào tự động (Onboarding) |
| `sync.js` | Script đồng bộ cơ sở dữ liệu — chạy `sequelize.sync()` để tạo/cập nhật bảng từ models |
| `package.json` | Khai báo dependencies và scripts (`npm run dev` chạy nodemon) |
| `.env` | Biến môi trường: DB connection, JWT_SECRET, GEMINI_API_KEY, ENCRYPTION_KEY, SMTP, Telegram Token, Redis URL, v.v. |
| `.gitignore` | Loại trừ `node_modules` khỏi Git |
| `addGoogleToken.js` | Script tiện ích để thêm OAuth2 token cho Google Calendar API |
| `dropConstraint.js` | Script tiện ích xóa ràng buộc (constraint) trong DB khi cần reset |
| `test_doc.js` | Script test thử tính năng phân tích giấy tờ bằng AI |

---

### `config/` — Cấu hình kết nối

| File | Chức năng |
|------|-----------|
| `database.js` | Khởi tạo **Sequelize ORM** kết nối tới SQL Server (dev) hoặc PostgreSQL (production). Đọc cấu hình từ `.env` |
| `redisClient.js` | Khởi tạo **Redis Client** kết nối tới Redis Server. Dùng cho: lưu Captcha, lưu OTP, Bull Queue (AI), cache |

---

### `constants/` — Hằng số hệ thống

| File | Chức năng |
|------|-----------|
| `roles.js` | Định nghĩa 4 vai trò hệ thống: `admin`, `hr_manager`, `department_manager`, `employee` |

---

### `middleware/` — Middleware xử lý request

| File | Chức năng |
|------|-----------|
| `authMiddleware.js` | **Xác thực JWT** — Kiểm tra header `Authorization: Bearer <token>`, giải mã JWT, kiểm tra tài khoản bị xóa/khóa, gắn `req.user` (id, role, roles, username, department) cho các route phía sau |
| `roleMiddleware.js` | **Phân quyền theo Role** — Nhận danh sách roles được phép, kiểm tra `req.user.roles` có nằm trong danh sách không. Trả 403 nếu không đủ quyền |
| `permissionMiddleware.js` | **Phân quyền nâng cao (RBAC mở rộng)** — Kiểm tra quyền theo 3 cấp: Employee cá nhân → Department phòng ban → Role vai trò. Hỗ trợ cấu hình quyền chi tiết từng tính năng cho từng cá nhân/phòng ban |

---

### `models/` — 30 file Sequelize Models (27 bảng + index + phụ)

| File | Bảng DB | Chức năng |
|------|---------|-----------|
| `index.js` | — | **Hub trung tâm** — Import tất cả models, thiết lập quan hệ (associations): belongsTo, hasMany, belongsToMany. Export tất cả models ra 1 object duy nhất |
| `Employee.js` | `Employees` | Thông tin nhân viên: id (UUID), username, fullName, email, passwordHash, department, status (active/inactive/probation/resigned), faceEncoding (mã hóa AES), faceEncodingIV, avatar, phoneNumber, isDeleted |
| `Role.js` | `Roles` | Vai trò hệ thống: id, name (admin/hr_manager/department_manager/employee), description |
| `EmployeeRole.js` | `EmployeeRoles` | Bảng trung gian quan hệ **nhiều-nhiều** Employee ↔ Role |
| `Department.js` | `Departments` | Phòng ban: id, name, description |
| `Attendance.js` | `Attendances` | Bản ghi chấm công: employeeId, date, checkInTime, checkOutTime, status (Present/Late/Absent/Half-day), checkInImage, checkOutImage, totalHours |
| `AttendanceExplanation.js` | `AttendanceExplanations` | Đơn giải trình chấm công: employeeId, type (Late/Missing_Punch/Leave_Early), date, reason, status (Pending/Approved/Rejected), reviewedBy |
| `Leave.js` | `Leaves` | Đơn nghỉ phép: employeeId, leaveType (Annual/Sick/Personal), startDate, endDate, reason, status (Pending/Approved/Rejected), approvedBy |
| `Salary.js` | `Salaries` | Cấu hình lương nhân viên: employeeId, baseSalary, allowance, otMultiplier, bankName, bankAccount, bankBranch |
| `Payroll.js` | `Payrolls` | Bảng lương tháng: employeeId, periodMonth, periodYear, baseSalary, regularHours, overtimeHours, overtimePay, grossSalary, allowance, lateDeduction, socialInsurance, taxableIncome, tax, advanceDeduction, deductions, netSalary, status |
| `AdvanceRequest.js` | `AdvanceRequests` | Đơn ứng lương: employeeId, amount, periodMonth, periodYear, reason, status (Pending/Approved/Rejected), approvedBy |
| `KPI.js` | `KPIs` | Chỉ tiêu hiệu suất: employeeId, name, weight, selfScore, managerScore, managerComment, period, status |
| `OnboardingRecord.js` | `OnboardingRecords` | Hồ sơ tiếp nhận nhân viên mới: employeeId, idCardFront, idCardBack, bankInfo, contractSigned, completedAt |
| `ScheduledEvent.js` | `ScheduledEvents` | Sự kiện hẹn giờ: creatorId, title, type (EMAIL/MEETING/REMINDER/HOLIDAY), scheduledAt, status (PENDING/PROCESSING/COMPLETED/FAILED), payload (JSON chứa to/subject/body), meetLink |
| `PolicyDocument.js` | `PolicyDocuments` | Tài liệu chính sách: title, content (Markdown), category, description, targetRoles (JSON array), status (DRAFT/SCHEDULED/PUBLISHED), scheduledPublishAt, attachmentUrl, createdBy |
| `Document.js` | `Documents` | Tài liệu nội bộ: title, description, filePath, fileType, fileSize, categoryId, uploadedBy, tags, accessRoles, status |
| `DocumentCategory.js` | `DocumentCategories` | Danh mục tài liệu: name, description, parentId (hỗ trợ cây thư mục lồng nhau) |
| `Message.js` | `Messages` | Tin nhắn chat nội bộ: senderId, receiverId, content, replyToId (tham chiếu ngược — trả lời tin nhắn), isRead |
| `TelegramAccount.js` | `TelegramAccounts` | Liên kết Telegram: employeeId, chatId, username |
| `WebFilterRule.js` | `WebFilterRules` | Quy tắc lọc web: urlPattern (wildcard), type (blacklist/whitelist), description, isActive |
| `WebAccessLog.js` | `WebAccessLogs` | Nhật ký truy cập web: employeeId, url, action (allowed/blocked), ip, browser, os, timestamp |
| `RuleExemption.js` | `RuleExemptions` | Miễn trừ quy tắc web: employeeId, ruleId — nhân viên nào được bỏ qua rule nào |
| `ExtensionHeartbeat.js` | `ExtensionHeartbeats` | Trạng thái Extension: employeeId, lastPing, browser, browserVersion, os, extensionVersion, isOnline |
| `RoleExtensionRequirement.js` | `RoleExtensionRequirements` | Yêu cầu cài Extension theo vai trò: roleId, isRequired |
| `EmployeeExtensionRequirement.js` | `EmployeeExtensionRequirements` | Yêu cầu cài Extension theo cá nhân: employeeId, isRequired |
| `DepartmentPermission.js` | `DepartmentPermissions` | Phân quyền theo phòng ban: department, feature, canRead/canWrite/canDelete |
| `EmployeePermission.js` | `EmployeePermissions` | Phân quyền theo cá nhân: employeeId, feature, canRead/canWrite/canDelete |
| `MenuItem.js` | `MenuItems` | Cấu hình menu sidebar: label, icon (tên icon Lucide), route, requiredRoles (JSON array), sortOrder, isActive, parentId |
| `Setting.js` | `Settings` | Cài đặt hệ thống dạng key-value: key (VD: `office_lat`, `geofence_radius`), value |
| `SecurityViolation.js` | `SecurityViolations` | Vi phạm bảo mật: employeeId, type, description, severity |

---

### `controllers/` — 21 Controller xử lý logic API

| File | Module | Chức năng chi tiết |
|------|--------|-------------------|
| `authController.js` | Xác thực | Captcha (GET), Register (POST), Login password (POST), Login FaceID (POST), Logout, Request OTP FaceID, Register Face, Request OTP đổi mật khẩu, Update Password |
| `attendanceController.js` | Chấm công | **Phức tạp nhất (31KB)** — Verify face (so khớp vector), Check-in (Geofencing + Extension check), Check-out, Lịch sử chấm công (bảng + calendar merge nghỉ phép), CRUD giải trình, Duyệt giải trình, Cảnh báo vi phạm (đi trễ ≥3, vắng ≥5, quên checkout ≥3), Thống kê admin |
| `leaveController.js` | Nghỉ phép | CRUD đơn nghỉ phép, Duyệt/Từ chối (Manager), Tính phép còn lại (hỗ trợ nửa ngày), Lịch sử nghỉ phép, Lọc theo trạng thái |
| `payrollController.js` | Tiền lương | **Tính lương tự động** (18KB) — Dựa trên ngày công, OT, phụ cấp, khấu trừ BHXH 10.5%, thuế TNCN 5%, trừ ứng lương. Xuất phiếu lương Excel (exceljs), Gửi email phiếu lương |
| `advanceRequestController.js` | Ứng lương | CRUD đơn ứng lương, Duyệt/Từ chối (Manager), Xem đơn theo tháng/năm |
| `kpiController.js` | Đánh giá KPI | CRUD chỉ tiêu KPI, Nhân viên tự chấm, Manager đánh giá + comment |
| `onboardingController.js` | Onboarding | Lưu hồ sơ nhân viên mới (CMND, ngân hàng, hợp đồng), Đánh dấu hoàn thành |
| `chatController.js` | Chat nội bộ | Gửi tin nhắn 1-1, Lấy lịch sử chat, Đánh dấu đã đọc, Lấy danh sách liên hệ, Hỗ trợ Reply tin nhắn |
| `scheduledEventController.js` | Lịch & Sự kiện | CRUD sự kiện (EMAIL/MEETING/REMINDER/HOLIDAY), Kéo thả đổi thời gian, Tích hợp Google Calendar (tạo Meet link), Xử lý Cron gửi email hẹn giờ |
| `policyController.js` | Chính sách | CRUD chính sách (Markdown), Phân quyền xem theo Role, Lên lịch phát hành (Scheduled → Published), AI hỏi đáp nội dung chính sách (Gemini), OCR trích xuất văn bản từ ảnh (Gemini Vision) |
| `documentController.js` | Tài liệu | Upload/Download tài liệu nội bộ, Phân loại theo danh mục, Phân quyền xem, Tìm kiếm |
| `documentCategoryController.js` | Danh mục tài liệu | CRUD danh mục tài liệu (hỗ trợ cây lồng nhau) |
| `menuController.js` | Quản lý Menu | CRUD menu sidebar (icon, label, route, quyền, thứ tự), Sắp xếp drag & drop, Bật/tắt mục menu |
| `permissionController.js` | Phân quyền RBAC | CRUD quyền theo phòng ban (DepartmentPermission), CRUD quyền theo cá nhân (EmployeePermission), Kiểm tra quyền tính năng |
| `analyticsController.js` | Dashboard | Thống kê tổng quan: Tổng NV, có mặt, đi trễ, nghỉ phép, vắng. Xu hướng chấm công 7-30 ngày. Phân bố phòng ban (pie chart) |
| `webFilterController.js` | Giám sát Web | **Lớn (17KB)** — CRUD rules chặn/cho phép URL, Log truy cập web, Heartbeat Extension, Chặn Ẩn danh (Incognito), Miễn trừ nhân viên, Cấu hình yêu cầu Extension theo Role/NV |
| `securityAIController.js` | AI Bảo mật | Phát hiện tin nhắn lừa đảo (Scam Detector), Xác thực giấy tờ (Document Verifier) — gọi `aiService` |
| `sepayController.js` | Ngân hàng | Tích hợp API SePay (giả lập cổng thanh toán), Kiểm tra số dư, Tạo lệnh chuyển khoản |
| `uploadController.js` | Upload file | Xử lý upload file (Multer), Giới hạn 10MB, Lưu vào `public/uploads/` |
| `googleCalendarController.js` | Google Calendar | Xác thực OAuth2, Tạo sự kiện Google Calendar, Tự động sinh Google Meet link |
| `departmentController.js` | Phòng ban | CRUD phòng ban |

---

### `services/` — Business Logic cốt lõi

| File | Chức năng chi tiết |
|------|-------------------|
| `aiService.js` | **Trí tuệ nhân tạo (37KB)** — Cấu hình Google Gemini (GenAI SDK), System Instruction (prompt hệ thống), 18 Function Tools (get_leave_balance, get_salary, create_leave_request, schedule_email, schedule_meeting, get_weather, get_news, search_policies, v.v.), Vòng lặp Agent (while functionCalls), ChatOps pattern (trả JSON cho FE render Form/Chart), Voice-to-Form parser, Scam Detector, Document Verifier (Vision) |
| `aiQueueService.js` | **Bull Queue cho AI** — Đẩy request AI vào hàng đợi Redis, Worker xử lý tuần tự, Trả kết quả qua Socket.IO (web) hoặc Telegram API. Retry khi Rate Limit (429), Tránh quá tải server |
| `telegramBot.js` | **Telegram Bot (28KB)** — Polling mode, 14+ lệnh: /start, /login, /logout, /thongtin, /luong, /diemdanh, /nghiphep, /xinnghi, /giaitrinh, /hengio, /thoitiet, /tintuc, /lich. Chat tự do với AI Gemini qua Bull Queue. Push thông báo chấm công/duyệt phép |
| `cryptoService.js` | **Mã hóa AES-256-CBC** — Encrypt/Decrypt face vector. Dùng ENCRYPTION_KEY từ .env, IV ngẫu nhiên 16 bytes |
| `faceVectorService.js` | **So sánh khuôn mặt** — Tính Euclidean Distance giữa 2 vector 128 chiều. Ngưỡng (threshold) 0.60 |
| `emailService.js` | **Gửi email SMTP** — Dùng Nodemailer, đọc cấu hình SMTP từ .env (host, port, user, pass) |
| `elasticService.js` | **Elasticsearch** — Tìm kiếm nâng cao (full-text search) cho nhân viên, tài liệu. Tích hợp tùy chọn |

#### `services/auth/` — Module xác thực

| File | Chức năng chi tiết |
|------|-------------------|
| `authService.js` | **Orchestrator xác thực** — Tạo Captcha (svg-captcha + Redis 3 phút), Verify Captcha, Register (hash bcrypt + mã hóa face vector), Login password, Login FaceID, Request OTP (FaceID/Password), Register Face (với OTP), Update Password (với OTP), Force logout phiên cũ |
| `authStrategy.js` | **Strategy Pattern** — `PasswordLoginStrategy`: tìm user + bcrypt compare + check Extension. `FaceIDLoginStrategy`: tìm user + giải mã AES + Euclidean Distance ≤ 0.60 + check Extension. Cả 2 kế thừa `AuthStrategy` (check yêu cầu Extension theo Role/NV) |
| `tokenService.js` | **JWT Token** — Sinh token chứa `{id, role, roles, username, loginTime}`, Thời hạn 1 ngày. Verify token |
| `authNotificationFacade.js` | **Facade thông báo** — Gửi cảnh báo đăng nhập qua Telegram (kèm ảnh nếu FaceID), Gửi OTP FaceID/Password qua Telegram/Email, Cảnh báo đổi mật khẩu, Force logout qua Socket.IO |

---

### `routes/` — 22 file định nghĩa API Routes

| File | Prefix API | Các endpoint chính |
|------|------------|-------------------|
| `authRoutes.js` | `/api/auth` | GET `/captcha`, POST `/register`, `/login`, `/login-face`, `/request-face-otp`, `/register-face`, `/logout`, `/request-otp-update-password`, `/update-password` |
| `attendanceRoutes.js` | `/api/attendance` | POST `/verify-face`, `/check-in`, `/check-out`, GET `/history`, `/today`, `/calendar`, POST `/explanation`, GET `/explanations`, PATCH `/explanations/:id` |
| `leaveRoutes.js` | `/api/leave` | POST `/`, GET `/`, `/balance`, `/my`, PATCH `/:id/approve`, `/:id/reject` |
| `payrollRoutes.js` | `/api/payroll` | POST `/calculate`, GET `/`, `/my`, `/:id/export-excel`, POST `/send-payslip-email` |
| `advanceRequestRoutes.js` | `/api/advance-requests` | POST `/`, GET `/`, `/me`, PATCH `/:id/approve`, `/:id/reject` |
| `employeeRoutes.js` | `/api/employees` | GET `/`, `/:id`, POST `/`, PATCH `/:id`, DELETE `/:id`, POST `/:id/roles`, v.v. (file lớn 9KB — nhiều endpoint quản lý nhân viên + role + extension) |
| `roleRoutes.js` | `/api/roles` | CRUD roles, Gán/Gỡ role, Cấu hình Extension requirement theo role |
| `kpiRoutes.js` | `/api/kpi` | CRUD KPI, PATCH `/self-evaluate`, `/manager-evaluate` |
| `onboardingRoutes.js` | `/api/onboarding` | POST `/`, GET `/:employeeId` |
| `chatRoutes.js` | `/api/chat` | POST `/ai`, `/voice-parse`, GET `/history/:partnerId`, `/contacts`, POST `/messages` |
| `scheduledEventRoutes.js` | `/api/events` | CRUD sự kiện, PATCH `/:id/reschedule`, GET `/my`, `/google-calendar` |
| `policyRoutes.js` | `/api/policies` | CRUD chính sách, POST `/ask-ai`, `/ocr-extract` |
| `documentRoutes.js` | `/api/documents` | Upload/Download/CRUD tài liệu, CRUD danh mục |
| `menuRoutes.js` | `/api/menu` | GET `/`, POST `/`, PUT `/:id`, DELETE `/:id`, PATCH `/reorder` |
| `permissionRoutes.js` | `/api/permissions` | CRUD quyền Employee/Department, GET `/check` |
| `analyticsRoutes.js` | `/api/analytics` | GET `/dashboard`, `/attendance-trend`, `/department-distribution` |
| `webFilterRoutes.js` | `/api/web-filter` | CRUD rules, POST `/log`, `/heartbeat`, GET `/access-logs`, `/extension-status`, CRUD exemptions, CRUD extension requirements |
| `securityAIRoutes.js` | `/api/security-ai` | POST `/detect-scam`, `/analyze-document` |
| `sepayRoutes.js` | `/api/sepay` | POST `/transfer`, GET `/balance` |
| `settingsRoutes.js` | `/api/settings` | GET `/`, PATCH `/`, GET `/features` (Feature Toggle) |
| `uploadRoutes.js` | `/api/upload` | POST `/` (Multer upload) |

---

### `utils/` — Tiện ích Backend

| File | Chức năng |
|------|-----------|
| `geoUtils.js` | **Công thức Haversine** — Tính khoảng cách (mét) giữa 2 tọa độ GPS trên mặt cầu Trái Đất. Dùng cho Geofencing check-in |
| `leaveUtils.js` | **Tính ngày nghỉ** — Tính số ngày phép đã dùng (hỗ trợ nửa ngày: ≤ 4.5h = 0.5 ngày), Loại bỏ T7/CN khỏi đếm |
| `stringUtils.js` | **Chuỗi tiện ích** — Hàm xử lý chuỗi dùng chung (format, sanitize) |

### `scripts/` — Scripts chạy thủ công

| File | Chức năng |
|------|-----------|
| `syncElastic.js` | Script đồng bộ dữ liệu từ SQL Server → Elasticsearch (chạy 1 lần hoặc theo lịch) |

---

## 📂 Frontend (`hrms-frontend/src/`)

### Gốc `src/`

| File | Chức năng |
|------|-----------|
| `main.tsx` | **Entry point** — Render `<App />` vào DOM, import `index.css` |
| `App.tsx` | **Component gốc** — Wrap toàn bộ app bằng Providers và Router |
| `App.css` | CSS mặc định của Vite (template ban đầu) |
| `index.css` | **CSS toàn cục** — Định nghĩa biến CSS (colors, fonts), reset styles, dark mode |

---

### `app/` — Cấu hình ứng dụng

| File | Chức năng |
|------|-----------|
| `Providers.tsx` | **Providers wrapper** — Bọc app bằng `QueryClientProvider` (React Query), `BrowserRouter` (React Router) |
| `Router.tsx` | **Routing chính** — Định nghĩa tất cả routes: `/login`, `/register`, `/attendance`, `/leave`, `/payroll`, `/employees`, `/profile`, `/chat`, `/events`, `/policies`, `/security`, `/settings`, `/onboarding`, `/performance`, `/feed`, `/ai-tools`, `/documents`. Bảo vệ route bằng auth check, phân quyền theo role |

---

### `stores/` — State Management (Zustand)

| File | Chức năng |
|------|-----------|
| `useAuthStore.ts` | **Auth state** — Lưu token + user info vào `localStorage` (`hrms-auth-storage`), Hàm login/logout, Auto-rehydrate khi reload |
| `authStore.ts` | Store phụ trợ cho auth (legacy compatibility) |
| `useGlobalSocket.ts` | **Socket.IO store (9.5KB)** — Kết nối/ngắt Socket, Join room theo userId, Lắng nghe tất cả sự kiện realtime: `force_logout`, `new_notification`, `ai_response`, `ai_proactive_message`, `hrms_attendance_warning`, `new_policy_announcement`, `new_access_log`, `extension_status_update`, `security_warning`, `explanation_submitted` |
| `useMenuStore.ts` | **Menu state** — Lưu cấu hình menu sidebar từ API, Toggle mở/đóng sidebar |
| `usePermissionStore.ts` | Store phân quyền (placeholder) |
| `useSettingsStore.ts` | **Settings state** — Lưu cấu hình hệ thống (Feature Toggle, GPS văn phòng, v.v.) |
| `useThemeStore.ts` | **Theme state** — Chuyển đổi Dark Mode / Light Mode, Lưu preference vào localStorage |
| `useToastStore.ts` | **Toast notification** — Quản lý queue thông báo popup (success/error/warning/info), Auto-dismiss |

---

### `services/` — API Service Layer (Axios)

| File | Chức năng |
|------|-----------|
| `api.ts` | **Axios instance chính** — Base URL từ env, Interceptor tự động gắn JWT token từ Zustand store vào header `Authorization`, Interceptor xử lý 401 → auto logout |
| `auth.ts` | API auth: `login()`, `register()`, `getCaptcha()`, `loginFace()` |
| `attendance.ts` | API chấm công: `verifyFace()`, `checkIn()`, `checkOut()`, `getHistory()`, `getCalendar()` |
| `leave.ts` | API nghỉ phép: `createLeave()`, `getLeaves()`, `getBalance()`, `approve()`, `reject()` |
| `analytics.ts` | API dashboard: `getDashboardStats()`, `getAttendanceTrend()` |
| `permission.ts` | API phân quyền: `getPermissions()`, `checkFeatureAccess()` |
| `policy.ts` | API chính sách: `getPolicies()`, `askAI()`, `ocrExtract()` |

---

### `hooks/` — Custom React Hooks

| File | Chức năng |
|------|-----------|
| `useFaceRecognition.ts` | **Hook nhận diện khuôn mặt (13KB)** — Load face-api.js models, Bật camera (MediaStream), Phát hiện khuôn mặt realtime, Trích xuất face descriptor (vector 128D), Vẽ bounding box lên canvas, Trả về `faceVector` để gửi lên server |
| `usePermission.ts` | Hook kiểm tra quyền (placeholder) |

---

### `components/` — UI Components tái sử dụng

#### `components/layout/` — Bố cục chính

| File | Chức năng |
|------|-----------|
| `AppShell.tsx` | **Layout chính** — Wrapper chứa Sidebar + Topbar + Main Content area. Áp dụng cho tất cả trang sau khi đăng nhập |
| `Sidebar.tsx` | **Thanh điều hướng bên** — Render menu từ `useMenuStore`, Highlight trang hiện tại, Responsive collapse trên mobile |
| `Topbar.tsx` | **Thanh trên (18KB)** — Hiển thị tên user, avatar, nút thông báo (bell icon + badge đếm), Dropdown profile (đổi mật khẩu, đăng xuất), Chuyển đổi ngôn ngữ (i18n), Toggle Dark Mode, Hiển thị thông báo realtime popup |
| `SecurityViolationGuard.tsx` | **Guard bảo mật (7KB)** — Kiểm tra vi phạm bảo mật của Extension (truy cập URL cấm, ẩn danh), Hiển thị cảnh báo fullscreen nếu có vi phạm nghiêm trọng |

#### `components/shared/` — Components chia sẻ

| File | Chức năng |
|------|-----------|
| `CommandPalette.tsx` | **Command Palette (8KB)** — Tìm kiếm nhanh bằng phím tắt (Ctrl+K), Điều hướng nhanh tới các trang, Tìm kiếm nhân viên, chức năng |

#### `components/ui/` — Design System primitives

| Thư mục | Chức năng |
|---------|-----------|
| `Avatar/` | Component hiển thị ảnh đại diện (có fallback chữ cái đầu) |
| `Badge/` | Component nhãn trạng thái (màu sắc theo loại: success/warning/error) |
| `Button/` | Component nút bấm (variants: primary/secondary/ghost/danger, sizes) |
| `Card/` | Component thẻ card (header, body, footer) |
| `Chatbot/` | Component khung chatbot AI (bubble nổi, panel chat) |
| `FaceScanner/` | Component quét khuôn mặt (hiển thị camera + canvas overlay) |
| `Input/` | Component trường nhập (text, password, email, search) |
| `Modal/` | Component modal/dialog (overlay, close button) |
| `Table/` | Component bảng dữ liệu (sortable, pagination) |
| `Tabs/` | Component tab chuyển đổi nội dung |
| `Toast/` | Component thông báo popup (auto-dismiss, stacking) |
| `WeatherWidget/` | Component widget thời tiết (gọi API OpenWeatherMap) |

#### `components/`

| File | Chức năng |
|------|-----------|
| `ErrorBoundary.tsx` | **Error Boundary** — Bắt lỗi render React, Hiển thị fallback UI thay vì crash trắng trang |

---

### `features/` — 17 Module UI chính

#### `features/auth/` — Đăng nhập & Đăng ký

| File | Chức năng |
|------|-----------|
| `Login.tsx` | **Trang đăng nhập (16KB)** — Form username/password + Captcha SVG, Tab đăng nhập FaceID (bật camera, quét khuôn mặt, gửi vector), Kiểm tra Extension active, Xử lý lỗi (sai mật khẩu, tài khoản bị khóa, Extension required), Chuyển hướng sau login |
| `Register.tsx` | **Trang đăng ký (6KB)** — Form tạo tài khoản: username, password, email, fullName + Captcha. Tùy chọn đăng ký FaceID ngay lúc tạo tài khoản |

#### `features/attendance/` — Chấm công

| File | Chức năng |
|------|-----------|
| `Attendance.tsx` | **Trang chấm công chính (39KB)** — Camera nhận diện khuôn mặt (face-api.js), Check-in 2 bước (Face → GPS Geofencing), Check-out, Hiển thị trạng thái hôm nay, Lịch sử chấm công dạng bảng, Form giải trình chấm công, Tab quản lý giải trình (Manager) |
| `AttendanceCalendar.tsx` | **Lịch chấm công (9KB)** — Hiển thị dạng Calendar (FullCalendar), Merge dữ liệu chấm công + nghỉ phép, Màu sắc theo trạng thái (xanh=Present, đỏ=Absent, vàng=Late) |
| `ExplanationForm.tsx` | **Form giải trình** — Chọn loại (Late/Missing Punch/Leave Early), Chọn ngày, Nhập lý do, Submit |

#### `features/chat/` — Chat & AI Chatbot

| File | Chức năng |
|------|-----------|
| `ChatbotWidget.tsx` | **Widget AI Chatbot (14KB)** — Nổi góc phải màn hình, Chat với AI Gemini, Hiển thị Markdown response, Xử lý ChatOps JSON (render Form xin phép / biểu đồ Recharts trong chat), Lưu lịch sử hội thoại, Typing indicator |
| `InternalChat.tsx` | **Chat nội bộ 1-1 (19KB)** — Danh sách liên hệ (nhân viên online), Gửi/nhận tin nhắn realtime (Socket.IO), Reply tin nhắn, Đánh dấu đã đọc, Tìm kiếm liên hệ |
| `components/ChatChart.tsx` | **Biểu đồ trong chat** — Render Recharts (Bar/Line/Pie) từ ChatOps JSON mà AI trả về |
| `components/MiniLeaveForm.tsx` | **Form xin phép trong chat** — Render Form nghỉ phép nhỏ gọn từ ChatOps JSON, Submit trực tiếp từ khung chat |

#### `features/dashboard/` — Dashboard

| File | Chức năng |
|------|-----------|
| `AdminDashboard.tsx` | **Dashboard Admin/Manager (21KB)** — Thẻ tổng quan: Tổng NV, Có mặt, Đi trễ, Nghỉ phép, Vắng mặt. Biểu đồ xu hướng chấm công (Line Chart 7-30 ngày). Biểu đồ phân bố phòng ban (Pie Chart). Danh sách đi trễ hôm nay |
| `EmployeeDashboard.tsx` | **Dashboard Nhân viên (17KB)** — Trạng thái chấm công hôm nay, Phép còn lại, Sự kiện sắp tới, Widget thời tiết, Thông báo gần đây, Nút chấm công nhanh |
| `QuickEventModal.tsx` | **Modal tạo sự kiện nhanh** — Tạo nhanh cuộc họp/nhắc nhở từ Dashboard |

#### `features/leave/` — Nghỉ phép

| File | Chức năng |
|------|-----------|
| `Leave.tsx` | **Trang nghỉ phép (13KB)** — Form tạo đơn nghỉ (loại, ngày bắt đầu/kết thúc hỗ trợ nửa ngày sáng/chiều, lý do), Danh sách đơn của tôi, Tab Manager: Duyệt/Từ chối đơn Pending, Hiển thị phép còn lại |

#### `features/payroll/` — Tiền lương

| File | Chức năng |
|------|-----------|
| `Payroll.tsx` | **Trang bảng lương (54KB — lớn nhất FE)** — Xem phiếu lương chi tiết theo tháng, Bảng chi tiết: lương cơ bản, OT, phụ cấp, khấu trừ, thuế, thực nhận. Nút xuất Excel. Tab Admin: Tính lương hàng loạt, Gửi phiếu lương email, Quản lý cấu hình lương nhân viên, Tích hợp SePay chuyển khoản |
| `AdvanceRequest.tsx` | **Trang ứng lương (15KB)** — Form tạo đơn ứng (số tiền, kỳ lương, lý do), Danh sách đơn, Tab Manager: Duyệt/Từ chối |

#### `features/employees/` — Quản lý Nhân sự

| File | Chức năng |
|------|-----------|
| `EmployeeList.tsx` | **Danh sách nhân viên (13KB)** — Bảng phân trang, Tìm kiếm, Lọc theo phòng ban/trạng thái, Nút thêm/sửa/xóa |
| `EmployeeDetail.tsx` | **Chi tiết nhân viên (19KB)** — Xem/Sửa thông tin cá nhân, Gán phòng ban, Gán/Gỡ role, Thay đổi trạng thái, Cấu hình lương, Xem lịch sử chấm công |

#### `features/profile/` — Hồ sơ cá nhân

| File | Chức năng |
|------|-----------|
| `Profile.tsx` | **Trang hồ sơ (18KB)** — Xem/Sửa thông tin cá nhân, Upload avatar, Đổi mật khẩu (OTP qua Email/Telegram), Đăng ký/Cập nhật FaceID (camera + OTP), Liên kết Telegram |

#### `features/events/` — Lịch & Sự kiện

| File | Chức năng |
|------|-----------|
| `EventCalendar.tsx` | **Lịch sự kiện tương tác (36KB)** — FullCalendar: xem ngày/tuần/tháng, Kéo thả sự kiện (drag & drop), CRUD sự kiện (Meeting/Email/Reminder/Holiday), Modal chi tiết sự kiện, Tích hợp Google Calendar, Tạo Google Meet link |

#### `features/policies/` — Chính sách

| File | Chức năng |
|------|-----------|
| `PolicyManagement.tsx` | **Quản lý chính sách (22KB)** — Danh sách chính sách (Published/Draft/Scheduled), Xem nội dung Markdown rendered, Tab Admin: CRUD chính sách, Editor Markdown, Phân quyền xem theo Role, Lên lịch phát hành |
| `PolicyAskAIModal.tsx` | **Modal hỏi AI (7KB)** — Chat với AI về nội dung một chính sách cụ thể. AI đọc nội dung document rồi trả lời câu hỏi |

#### `features/security/` — Bảo mật & Giám sát Web

| File | Chức năng |
|------|-----------|
| `Security.tsx` | **Trang bảo mật chính** — Container tabs: Web Filter, RBAC, Security Violations |
| `WebFilterTab.tsx` | **Tab Web Filter (22KB)** — CRUD rules chặn/cho phép URL (wildcard), Danh sách log truy cập web realtime, Trạng thái Extension từng nhân viên, Miễn trừ nhân viên khỏi rule |
| `RbactTab.tsx` | **Tab RBAC (14KB)** — Cấu hình quyền theo Role, Phòng ban, Cá nhân. Cấu hình yêu cầu Extension theo Role/NV |
| `SecurityViolationTab.tsx` | **Tab Vi phạm (7KB)** — Danh sách vi phạm bảo mật: truy cập URL cấm, dùng ẩn danh, tắt Extension |
| `BlockedWarning.tsx` | **Trang cảnh báo bị chặn** — Hiển thị khi nhân viên có vi phạm bảo mật nghiêm trọng, Nút quay lại |

#### `features/settings/` — Cài đặt

| File | Chức năng |
|------|-----------|
| `Settings.tsx` | **Trang cài đặt chính (6KB)** — Container tabs: Menu Management, Department, General Settings. Feature Toggle bật/tắt module |
| `MenuManagementTab.tsx` | **Tab quản lý Menu (23KB)** — CRUD mục menu sidebar: icon (chọn từ Lucide), label, route, quyền truy cập, thứ tự. Drag & Drop sắp xếp, Bật/tắt mục |
| `DepartmentTab.tsx` | **Tab phòng ban** — CRUD phòng ban |

#### `features/ai-tools/` — Công cụ AI Bảo mật

| File | Chức năng |
|------|-----------|
| `AITools.tsx` | **Trang công cụ AI** — Container tabs: Scam Detector, Document Verifier |
| `ScamDetectorTab.tsx` | **Phát hiện lừa đảo (5KB)** — Textarea paste tin nhắn nghi ngờ, Gửi Gemini phân tích, Hiển thị kết quả: mức độ rủi ro, loại scam, dấu hiệu nghi vấn, khuyến nghị |
| `DocumentVerifierTab.tsx` | **Xác thực giấy tờ (10KB)** — Upload ảnh (CMND/Hợp đồng), Gửi Gemini Vision phân tích, Hiển thị: loại giấy tờ, thông tin trích xuất, dấu hiệu bất thường, kết luận (Hợp lệ/Nghi ngờ/Giả mạo) |

#### `features/onboarding/` — Onboarding

| File | Chức năng |
|------|-----------|
| `Onboarding.tsx` | **Wizard Onboarding (16KB)** — Form nhiều bước: Bước 1 — Thông tin cá nhân, Bước 2 — Upload CMND/CCCD (trước/sau), Bước 3 — Thông tin ngân hàng, Bước 4 — Ký hợp đồng. Progress bar, Lưu từng bước |

#### `features/performance/` — Đánh giá KPI

| File | Chức năng |
|------|-----------|
| `Performance.tsx` | **Trang KPI (19KB)** — Danh sách chỉ tiêu KPI theo kỳ, Nhân viên tự chấm điểm, Manager đánh giá + comment, Tab Admin: Tạo/gán KPI |

#### `features/social/` — Bảng tin

| File | Chức năng |
|------|-----------|
| `SocialFeed.tsx` | **Bảng tin nội bộ (12KB)** — Feed dạng mạng xã hội, Đăng bài/tin tức công ty, Like/Comment (nếu có) |

#### `features/documents/` — Quản lý Tài liệu

| File | Chức năng |
|------|-----------|
| `pages/DocumentsPage.tsx` | **Trang tài liệu chính (9KB)** — Hiển thị danh sách tài liệu theo danh mục, Tìm kiếm, Lọc |
| `components/CategoryTree.tsx` | **Cây danh mục (5KB)** — Hiển thị cấu trúc danh mục lồng nhau (tree view), Chọn danh mục để lọc |
| `components/DocumentCard.tsx` | **Thẻ tài liệu (4KB)** — Card hiển thị: tiêu đề, mô tả, loại file, kích thước, ngày upload |
| `components/DocumentList.tsx` | **Danh sách tài liệu** — Grid/List view các DocumentCard |
| `components/DocumentViewerModal.tsx` | **Modal xem tài liệu (10KB)** — Preview tài liệu (PDF/hình ảnh), Nút download |
| `components/UploadDocumentModal.tsx` | **Modal upload tài liệu (8KB)** — Form upload: chọn file, nhập tiêu đề, mô tả, tags, danh mục, phân quyền xem |
| `api/documentApi.ts` | API gọi CRUD tài liệu |
| `api/documentCategoryApi.ts` | API gọi CRUD danh mục tài liệu |
| `hooks/useDocuments.ts` | React Query hook quản lý state tài liệu (fetching, caching, mutation) |
| `hooks/useDocumentCategories.ts` | React Query hook quản lý state danh mục |

---

### `i18n/` — Đa ngôn ngữ

| File | Chức năng |
|------|-----------|
| `index.ts` | Cấu hình `i18next` + `react-i18next`. Định nghĩa translations Tiếng Việt (`vi`) và Tiếng Anh (`en`) cho toàn bộ UI labels |

### `utils/` — Tiện ích Frontend

| File | Chức năng |
|------|-----------|
| `format.ts` | Hàm format: ngày tháng, tiền tệ VNĐ, giờ phút, số |
| `checkExtension.ts` | Kiểm tra Chrome Extension HRMS có đang active không (gửi message qua `chrome.runtime`) |

---

## 📂 Chrome Extension (`hrms-extension/`)

| File | Chức năng |
|------|-----------|
| `manifest.json` | **Cấu hình Extension Manifest V3** — Khai báo permissions: `webNavigation`, `tabs`, `storage`, `alarms`. Background service worker, Content scripts, Popup |
| `background.js` | **Service Worker (9KB)** — Chạy ngầm: Lắng nghe `chrome.webNavigation` → So sánh URL với rules (wildcard → RegExp) → Chặn (redirect blocked.html) hoặc Log. Heartbeat gửi ping mỗi 2 phút (chrome.alarms). Sync rules mỗi 5 phút. Phát hiện tab Ẩn danh → Đóng + log vi phạm. Gửi access log về backend |
| `content.js` | **Content Script (1.8KB)** — Inject vào trang web để thu thập thông tin (URL, title), Giao tiếp với background.js qua `chrome.runtime.sendMessage` |
| `popup.html` | **Popup UI (4KB)** — Giao diện popup khi click icon Extension: Form đăng nhập (username/password), Hiển thị trạng thái kết nối, Nút đăng xuất |
| `popup.js` | **Logic Popup (3.9KB)** — Xử lý đăng nhập Extension (gọi API `/api/auth/login`), Lưu token vào `chrome.storage.local`, Hiển thị thông tin user đang đăng nhập, Gửi heartbeat khi login thành công |
| `blocked.html` | **Trang cảnh báo bị chặn (3.2KB)** — HTML hiển thị khi nhân viên truy cập URL nằm trong blacklist: thông báo lý do, URL bị chặn, nút quay lại trang trước |
| `icons/` | Thư mục chứa icon Extension (16x16, 48x48, 128x128) |

---

## 📊 Thống kê tổng quan

| Chỉ số | Giá trị |
|--------|---------|
| **Tổng số file Backend** | ~70 files |
| **Tổng số file Frontend** | ~65 files |
| **Tổng số file Extension** | 6 files |
| **Tổng số Models (bảng DB)** | 29 models |
| **Tổng số Controllers** | 21 controllers |
| **Tổng số Route groups** | 22 route files |
| **Tổng số Feature modules (FE)** | 17 modules |
| **Tổng số UI Components** | 12+ component folders |
| **Tổng số Zustand Stores** | 8 stores |
| **File lớn nhất Backend** | `aiService.js` — 37KB (751 dòng) |
| **File lớn nhất Frontend** | `Payroll.tsx` — 54KB |
| **File controller lớn nhất** | `attendanceController.js` — 31KB |
