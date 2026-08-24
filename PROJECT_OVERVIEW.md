# ĐỀ TÀI: XÂY DỰNG HỆ THỐNG QUẢN TRỊ NHÂN SỰ TÍCH HỢP TRÍ TUỆ NHÂN TẠO (HRMS 4.0)

---

## 1. Giới thiệu đề tài

**Tên đề tài:** Xây dựng Hệ thống Quản trị Nhân sự thông minh tích hợp Trí tuệ Nhân tạo (HRMS 4.0)

**Mô tả tổng quan:** Hệ thống HRMS 4.0 là một ứng dụng web toàn diện dành cho doanh nghiệp, cho phép quản lý trọn vòng đời nhân sự — từ tiếp nhận nhân viên mới (Onboarding), chấm công bằng nhận diện khuôn mặt (Face Recognition), quản lý nghỉ phép, tính lương tự động, đánh giá hiệu suất KPI, đến giám sát hành vi truy cập web của nhân viên thông qua Extension trình duyệt. Điểm nhấn công nghệ là tích hợp sâu AI (Gemini) với kỹ thuật Function Calling, cho phép nhân viên tương tác với hệ thống nhân sự bằng ngôn ngữ tự nhiên (ChatOps), kết hợp Telegram Bot và hệ thống thông báo Realtime qua Socket.IO.

---

## 2. Kiến trúc Hệ thống & Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Frontend (SPA)** | React 19, Vite 8, TypeScript, Tailwind CSS 3 |
| **Backend (API)** | Node.js, Express 5, Sequelize ORM |
| **Cơ sở dữ liệu** | Microsoft SQL Server (dev) / PostgreSQL (production via Docker) |
| **Realtime** | Socket.IO (WebSocket) |
| **Hàng đợi (Queue)** | Redis + Bull Queue |
| **AI / LLM** | Google Gemini (GenAI SDK) với Function Calling |
| **Nhận diện khuôn mặt** | face-api.js + MediaPipe (Client-side) |
| **Telegram Bot** | node-telegram-bot-api |
| **Lịch đồng bộ** | Google Calendar API |
| **Email** | Nodemailer (SMTP) |
| **Triển khai** | Docker Compose (Frontend + Backend + PostgreSQL + Redis) |
| **Browser Extension** | Chrome Extension Manifest V3 |
| **State Management** | Zustand + React Query (TanStack Query) |
| **Biểu đồ / Chart** | Recharts |
| **Đa ngôn ngữ** | i18next |

---

## 3. Danh sách Chức năng Chi tiết & Ước lượng Thời gian

> **Ghi chú:** Thời gian ước lượng dưới đây tính cho **1 người phát triển fullstack**, bao gồm cả thiết kế DB, xây dựng API Backend, giao diện Frontend, và kiểm thử cơ bản. Đây là ước lượng thực tế dựa trên độ phức tạp quan sát được trong code.

---

### MODULE 1: Xác thực & Phân quyền (Authentication & Authorization)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 1.1 | Đăng nhập (Login) | Xác thực bằng username/password, trả JWT Token, Captcha chống brute-force (svg-captcha) | 2 ngày |
| 1.2 | Đăng ký (Register) | Tạo tài khoản mới, mã hóa mật khẩu bcrypt, gán role mặc định | 1 ngày |
| 1.3 | Đổi mật khẩu có OTP | Xác minh OTP qua Email hoặc Telegram trước khi cho phép đổi mật khẩu | 2 ngày |
| 1.4 | Hệ thống phân quyền RBAC | Role-Based Access Control: Admin, HR Manager, Dept Manager, Employee. Phân quyền theo Role, theo Phòng ban, và theo cá nhân | 3 ngày |
| 1.5 | Feature Toggle (Bật/Tắt chức năng) | Admin có thể bật/tắt từng module qua cài đặt hệ thống, Frontend kiểm tra trước khi render trang | 1 ngày |
| | **Tổng Module 1** | | **9 ngày** |

---

### MODULE 2: Quản lý Nhân sự (Employee Management)


| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 2.1 | Danh sách nhân viên | Hiển thị bảng, tìm kiếm, lọc theo phòng ban/trạng thái, phân trang | 2 ngày |
| 2.2 | Chi tiết nhân viên | Xem/sửa thông tin cá nhân, phòng ban, vai trò, trạng thái, thông tin lương | 2 ngày |
| 2.3 | Quản lý Phòng ban | CRUD phòng ban, gán nhân viên vào phòng ban | 1.5 ngày |
| 2.4 | Quản lý Vai trò (Role) | CRUD vai trò, gán/gỡ role cho nhân viên, cấu hình yêu cầu Extension theo role | 2 ngày |
| 2.5 | Hồ sơ cá nhân (Profile) | Nhân viên tự xem/cập nhật thông tin cá nhân, avatar, đổi mật khẩu | 1.5 ngày |
| 2.6 | Đăng ký/Cập nhật Face ID | Thu thập face vector qua camera, mã hóa AES lưu trữ, xác minh OTP trước khi cập nhật | 3 ngày |
| | **Tổng Module 2** | | **12 ngày** |

---

### MODULE 3: Chấm công (Attendance)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 3.1 | Check-in bằng nhận diện khuôn mặt | Bước 1: Quét khuôn mặt → so sánh vector (cosine similarity, ngưỡng 0.6). Bước 2: Xác minh vị trí GPS (Geofencing). Trả verifyToken tạm 2 phút | 5 ngày |
| 3.2 | Check-out | Ghi nhận giờ ra, tính số giờ làm việc, xác định trạng thái (Present/Late/Half-day) | 1.5 ngày |
| 3.3 | Lịch sử chấm công | Xem lịch sử dạng bảng và dạng lịch (Calendar view với FullCalendar), lọc theo tháng | 2 ngày |
| 3.4 | Giải trình chấm công | Tạo đơn giải trình khi đi muộn/quên chấm (Late, Missing Punch, Leave Early), quản lý duyệt/từ chối | 2 ngày |
| 3.5 | Kiểm tra Extension Heartbeat | Kiểm tra nhân viên có bật extension trình duyệt trước khi cho chấm công (tùy cấu hình role) | 1.5 ngày |
| 3.6 | Geofencing (Hàng rào ảo GPS) | Cấu hình tọa độ văn phòng + bán kính cho phép, kiểm tra vị trí nhân viên khi check-in | 2 ngày |
| 3.7 | Thông báo Telegram khi chấm công | Tự động gửi tin nhắn Telegram xác nhận đã check-in/out thành công | 1 ngày |
| | **Tổng Module 3** | | **15 ngày** |

---

### MODULE 4: Quản lý Nghỉ phép (Leave Management)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 4.1 | Tạo đơn nghỉ phép | Chọn loại phép (Annual/Sick/Personal), ngày bắt đầu/kết thúc (hỗ trợ nửa ngày), lý do | 2 ngày |
| 4.2 | Duyệt/Từ chối đơn phép | Manager xem danh sách đơn Pending, duyệt hoặc từ chối với ghi chú | 1.5 ngày |
| 4.3 | Tính số phép còn lại | Tự động tính toán phép đã dùng (hỗ trợ tính nửa ngày) so với quỹ phép năm | 1 ngày |
| 4.4 | Lịch sử nghỉ phép | Xem, lọc, xuất danh sách nghỉ phép theo trạng thái/thời gian | 1 ngày |
| | **Tổng Module 4** | | **5.5 ngày** |

---

### MODULE 5: Tiền lương & Tài chính (Payroll & Finance)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 5.1 | Cấu hình bậc lương | Thiết lập lương cơ bản, phụ cấp, thông tin ngân hàng cho từng nhân viên | 1.5 ngày |
| 5.2 | Tính lương tự động | Tự động tính dựa trên ngày công thực tế, ngày nghỉ phép, phụ cấp, khấu trừ (BHXH, thuế TNCN) | 4 ngày |
| 5.3 | Phiếu lương (Payslip) | Xem phiếu lương chi tiết theo tháng, xuất Excel (exceljs) | 2 ngày |
| 5.4 | Ứng lương (Advance Request) | Nhân viên tạo đơn ứng lương, quản lý duyệt/từ chối, tự động trừ vào lương tháng | 2.5 ngày |
| 5.5 | Tích hợp SePay (Ngân hàng) | API giả lập/tích hợp cổng thanh toán SePay cho chuyển khoản lương | 2 ngày |
| 5.6 | Gửi phiếu lương qua Email | Tự động gửi email kèm phiếu lương cho nhân viên, hỗ trợ đính kèm file | 1.5 ngày |
| | **Tổng Module 5** | | **13.5 ngày** |

---

### MODULE 6: Đánh giá Hiệu suất (Performance / KPI)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 6.1 | Quản lý chỉ tiêu KPI | Admin/Manager tạo, chỉnh sửa, gán KPI cho nhân viên theo kỳ | 2 ngày |
| 6.2 | Nhân viên tự đánh giá | Nhân viên cập nhật tiến độ, điểm tự chấm cho từng KPI | 1.5 ngày |
| 6.3 | Manager đánh giá & phê duyệt | Manager xem, chấm điểm, comment cho KPI của nhân viên | 1.5 ngày |
| | **Tổng Module 6** | | **5 ngày** |

---

### MODULE 7: Onboarding Nhân viên mới
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 7.1 | Luồng Onboarding (Wizard) | Nhân viên mới điền thông tin cá nhân, tải CMND/CCCD, thông tin ngân hàng, ký hợp đồng | 3 ngày |
| 7.2 | AI Onboarding chào đón | Socket tự động phát hiện nhân viên mới (< 24h), gửi tin nhắn chào mừng qua Chatbot | 0.5 ngày |
| | **Tổng Module 7** | | **3.5 ngày** |

---

### MODULE 8: Trợ lý AI thông minh (AI Chatbot + ChatOps)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 8.1 | AI Chatbot Widget | Widget chat AI nổi trên mọi trang, lưu lịch sử hội thoại, hỗ trợ markdown rendering | 3 ngày |
| 8.2 | Function Calling (11 tools) | AI tự động gọi các hàm backend: tra cứu phép, lương, chấm công, tạo đơn nghỉ, giải trình, đặt lịch email, thời tiết, tin tức | 5 ngày |
| 8.3 | ChatOps – Tạo đơn qua chat | AI trả về block `chatops` JSON, Frontend tự render Form xin nghỉ hoặc biểu đồ Recharts trực tiếp trong chat | 3 ngày |
| 8.4 | Phân quyền AI theo Role | AI nhận biết quyền user (admin/manager/employee), chỉ trả kết quả phù hợp, manager có thêm tool thống kê | 1.5 ngày |
| 8.5 | AI Queue (Bull + Redis) | Xử lý yêu cầu AI qua hàng đợi để tránh quá tải, retry khi lỗi | 2 ngày |
| | **Tổng Module 8** | | **14.5 ngày** |

---

### MODULE 9: Công cụ AI Bảo mật
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 9.1 | Phát hiện tin nhắn lừa đảo (Scam Detector) | Nhân viên paste tin nhắn nghi ngờ → AI phân tích và đánh giá mức độ rủi ro lừa đảo | 2 ngày |
| 9.2 | Xác thực giấy tờ (Document Verifier) | Upload hình ảnh giấy tờ (CMND, hợp đồng) → AI phân tích tính toàn vẹn, phát hiện dấu hiệu giả mạo | 2.5 ngày |
| | **Tổng Module 9** | | **4.5 ngày** |

---

### MODULE 10: Chat Nội bộ Realtime (Internal Chat)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 10.1 | Chat 1-1 | Gửi tin nhắn văn bản realtime giữa 2 nhân viên qua Socket.IO | 3 ngày |
| 10.2 | Trả lời tin nhắn (Reply) | Trích dẫn và trả lời một tin nhắn cụ thể | 1 ngày |
| 10.3 | Danh sách liên hệ & tìm kiếm | Hiển thị danh sách nhân viên online, tìm kiếm theo tên | 1 ngày |
| 10.4 | Lưu trữ tin nhắn | Lưu toàn bộ lịch sử chat vào Database (model Message) | 0.5 ngày |
| | **Tổng Module 10** | | **5.5 ngày** |

---

### MODULE 11: Telegram Bot
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 11.1 | Liên kết tài khoản Telegram | Nhân viên liên kết tài khoản Telegram cá nhân với tài khoản HRMS (xác minh bằng mật khẩu) | 2 ngày |
| 11.2 | Tra cứu HR qua Telegram | Các lệnh: xem phiếu lương (/salary), phép (/leave), chấm công (/attendance), sự kiện (/events) | 3 ngày |
| 11.3 | Xin nghỉ qua Telegram | Tạo đơn nghỉ phép trực tiếp từ Telegram, nhận phản hồi trạng thái | 1.5 ngày |
| 11.4 | Thông báo Push qua Telegram | Nhận thông báo chấm công, duyệt phép, email mới... qua Telegram | 1.5 ngày |
| 11.5 | Tra cứu thời tiết & tin tức | Xem thời tiết (OpenWeatherMap), đọc tin tức (VNExpress RSS), tính ngày âm lịch | 1 ngày |
| 11.6 | AI Chat qua Telegram | Hỏi AI (Gemini) trực tiếp từ Telegram, xử lý qua Bull Queue | 2 ngày |
| | **Tổng Module 11** | | **11 ngày** |

---

### MODULE 12: Lịch & Sự kiện (Events & Calendar)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 12.1 | Lịch sự kiện tương tác | Hiển thị sự kiện dạng Calendar (FullCalendar), kéo thả (drag & drop), xem theo ngày/tuần/tháng | 3 ngày |
| 12.2 | Tạo/Sửa/Xóa sự kiện | CRUD sự kiện: tiêu đề, mô tả, thời gian, loại sự kiện (Meeting/Email/Reminder/Holiday) | 2 ngày |
| 12.3 | Gửi email hẹn giờ (Cron Job) | Cron chạy mỗi phút, quét sự kiện PENDING đến giờ → gửi email tự động, cập nhật trạng thái | 2 ngày |
| 12.4 | Đồng bộ Google Calendar | Tích hợp Google Calendar API để đồng bộ sự kiện 2 chiều | 2 ngày |
| | **Tổng Module 12** | | **9 ngày** |

---

### MODULE 13: Quản lý Chính sách & Tài liệu (Policy Management)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 13.1 | CRUD Chính sách | Tạo, sửa, xóa văn bản chính sách nội bộ (với nội dung Markdown rich-text) | 2 ngày |
| 13.2 | Phân quyền xem theo Role | Chỉ định chính sách cho role cụ thể (ví dụ: chỉ HR mới xem Chính sách tuyển dụng) | 1 ngày |
| 13.3 | Lên lịch phát hành (Scheduled Publish) | Đặt lịch tự động chuyển trạng thái SCHEDULED → PUBLISHED vào thời điểm định trước (Cron) | 1.5 ngày |
| 13.4 | Thông báo chính sách mới | Phát thông báo Realtime (Socket) + gửi Email tự động khi chính sách được phát hành | 1.5 ngày |
| 13.5 | Hỏi AI về chính sách | Modal "Hỏi AI" cho phép nhân viên hỏi AI về nội dung chính sách, AI đọc nội dung document rồi trả lời | 2 ngày |
| | **Tổng Module 13** | | **8 ngày** |

---

### MODULE 14: Giám sát Web & Chrome Extension (Web Filter)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 14.1 | Chrome Extension (Manifest V3) | Extension ghi log truy cập web, chặn trang cấm, gửi heartbeat về server | 4 ngày |
| 14.2 | Quản lý Rule chặn/cho phép | Admin CRUD URL pattern (whitelist/blacklist), mô tả, miễn trừ nhân viên cụ thể | 2 ngày |
| 14.3 | Web Access Log (Nhật ký truy cập) | Ghi nhận & hiển thị lịch sử duyệt web của nhân viên (URL, thời gian, duration) | 2 ngày |
| 14.4 | Heartbeat & Giám sát Extension | Extension gửi heartbeat định kỳ, server kiểm tra nhân viên có đang bật extension hay không | 2 ngày |
| 14.5 | Trang cảnh báo bị chặn (Blocked Page) | Trang HTML hiển thị khi nhân viên truy cập URL bị cấm, có nút quay lại | 0.5 ngày |
| 14.6 | Cấu hình yêu cầu Extension theo Role/NV | Admin bật/tắt yêu cầu cài extension theo từng Role hoặc từng nhân viên | 1.5 ngày |
| | **Tổng Module 14** | | **12 ngày** |

---

### MODULE 15: Dashboard & Phân tích (Analytics)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 15.1 | Admin Dashboard | Tổng quan: Tổng NV, có mặt hôm nay, đi trễ, nghỉ phép, vắng mặt, tỷ lệ chuyên cần. Biểu đồ xu hướng chấm công | 3 ngày |
| 15.2 | Employee Dashboard | Dashboard cá nhân: chấm công hôm nay, phép còn lại, sự kiện sắp tới, widget thời tiết | 2 ngày |
| 15.3 | Xu hướng chấm công (Trend) | Biểu đồ đường (Recharts) hiển thị xu hướng đi làm/đi trễ/vắng mặt 7-30 ngày | 1.5 ngày |
| 15.4 | Phân bố phòng ban | Biểu đồ tròn (Pie chart) phân bố nhân viên theo phòng ban | 1 ngày |
| 15.5 | Widget Thời tiết | Widget hiển thị thời tiết realtime (OpenWeatherMap) trên Dashboard | 1 ngày |
| | **Tổng Module 15** | | **8.5 ngày** |

---

### MODULE 16: Hệ thống Thông báo Realtime
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 16.1 | Socket.IO Notification | Push notification realtime cho: chấm công, duyệt phép, email mới, chính sách mới | 2 ngày |
| 16.2 | Room-based routing | Phân room theo User ID (tin nhắn riêng) và Admin Room (thông báo quản lý) | 1 ngày |
| | **Tổng Module 16** | | **3 ngày** |

---

### MODULE 17: Bảng tin Xã hội (Social Feed)
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 17.1 | Bảng tin nội bộ (Feed) | Dạng mạng xã hội nội bộ, đăng bài/tin tức trong công ty | 2 ngày |
| | **Tổng Module 17** | | **2 ngày** |

---

### MODULE 18: Cài đặt Hệ thống & Cấu hình
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 18.1 | Quản lý Menu điều hướng | Admin tùy chỉnh, sắp xếp, bật/tắt các mục menu sidebar (icon, label, route, quyền, thứ tự) | 3 ngày |
| 18.2 | Cài đặt chung (Settings) | Cấu hình Feature Toggle, tọa độ GPS văn phòng, bán kính geofencing | 1.5 ngày |
| 18.3 | Dark Mode / Theme | Hỗ trợ chuyển đổi giao diện sáng/tối | 1 ngày |
| 18.4 | Đa ngôn ngữ (i18n) | Hỗ trợ Tiếng Việt / Tiếng Anh | 1.5 ngày |
| | **Tổng Module 18** | | **7 ngày** |

---

### MODULE 19: Hạ tầng & DevOps
| # | Chức năng | Mô tả chi tiết | Ước lượng |
|---|---|---|---|
| 19.1 | Docker Compose | Containerize 4 service: Frontend (Nginx), Backend, PostgreSQL, Redis | 2 ngày |
| 19.2 | Upload file lớn | API upload hỗ trợ ảnh, tài liệu, giấy tờ (Multer, limit 10MB) | 1 ngày |
| 19.3 | Mã hóa dữ liệu nhạy cảm | Mã hóa AES-256 cho face vector, giải mã khi xác minh | 1 ngày |
| | **Tổng Module 19** | | **4 ngày** |

---

## 4. Tổng hợp Khối lượng

| Module | Tên Module | Thời gian |
|---|---|---|
| Module 1 | Xác thực & Phân quyền | 9 ngày |
| Module 2 | Quản lý Nhân sự | 12 ngày |
| Module 3 | Chấm công (Face Recognition + GPS) | 15 ngày |
| Module 4 | Quản lý Nghỉ phép | 5.5 ngày |
| Module 5 | Tiền lương & Tài chính | 13.5 ngày |
| Module 6 | Đánh giá Hiệu suất KPI | 5 ngày |
| Module 7 | Onboarding Nhân viên mới | 3.5 ngày |
| Module 8 | Trợ lý AI Chatbot + ChatOps | 14.5 ngày |
| Module 9 | Công cụ AI Bảo mật | 4.5 ngày |
| Module 10 | Chat Nội bộ Realtime | 5.5 ngày |
| Module 11 | Telegram Bot | 11 ngày |
| Module 12 | Lịch & Sự kiện | 9 ngày |
| Module 13 | Quản lý Chính sách | 8 ngày |
| Module 14 | Giám sát Web & Extension | 12 ngày |
| Module 15 | Dashboard & Phân tích | 8.5 ngày |
| Module 16 | Thông báo Realtime | 3 ngày |
| Module 17 | Bảng tin Xã hội | 2 ngày |
| Module 18 | Cài đặt & Cấu hình | 7 ngày |
| Module 19 | Hạ tầng & DevOps | 4 ngày |
| | **TỔNG CỘNG** | **~153 ngày** (~30.5 tuần ≈ **7.5 tháng** làm việc cho 1 dev) |

---

## 5. Điểm nổi bật về Kỹ thuật

### Các điểm kỹ thuật đáng chú ý:

1. **AI Function Calling nâng cao**: Không chỉ chat đơn giản, AI Chatbot sử dụng 11 function tools để thực sự tương tác với hệ thống HR (tra cứu lương, tạo đơn, đặt lịch email...). Đây là kỹ thuật Agentic AI.

2. **ChatOps Pattern**: AI trả về structured JSON (block `chatops`) để Frontend tự render UI components (Form xin phép, biểu đồ Recharts) — pattern tiên tiến trong DevOps/Enterprise.

3. **Bảo mật 2 lớp cho chấm công**: Kết hợp nhận diện khuôn mặt (face-api.js client-side) + Geofencing (GPS) + Heartbeat Extension kiểm tra. Face vector được mã hóa AES-256.

4. **Kiến trúc Event-Driven**: Sử dụng Socket.IO cho realtime + Bull Queue (Redis) cho xử lý bất đồng bộ + Cron Job cho tác vụ định kỳ.

5. **Đa nền tảng**: Web App (React) + Chrome Extension (MV3) + Telegram Bot — 3 kênh tương tác khác nhau cho nhân viên.

6. **Containerization**: Docker Compose cho phép triển khai toàn bộ hệ thống (4 service) bằng một lệnh duy nhất.

---

## 6. Tổng kết Số liệu

| Chỉ số | Giá trị |
|---|---|
| Tổng số module chức năng | **19 module** |
| Tổng số chức năng con | **~60 chức năng** |
| Tổng số Database Models | **27 bảng** |
| Tổng số API Routes | **21 nhóm routes** |
| Tổng thời gian ước lượng (1 dev) | **~153 ngày (~7.5 tháng)** |
| Số dòng code Backend (ước tính) | ~5,000+ LOC |
| Số dòng code Frontend (ước tính) | ~10,000+ LOC |
| Số công nghệ/thư viện tích hợp | ~35+ |
