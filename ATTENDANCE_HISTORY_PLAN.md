# Kế hoạch Triển khai Lịch sử Chấm công (Dành cho Admin)

Tính năng: Admin có quyền xem lịch sử chấm công của bất kỳ nhân viên nào trong công ty. Cho phép chọn nhân viên, tháng, năm (tối đa 3 năm trở về trước) và có thể lọc theo các ngày cụ thể.

## 1. Backend (Node.js/Express)

### 1.1 Thêm Endpoint API
- **File:** `hrms-backend/routes/attendanceRoutes.js`
- **Route:** `GET /employee-history`
- **Quyền truy cập:** Sử dụng `roleMiddleware('admin')` để đảm bảo **chỉ có Admin** mới có quyền gọi API này.
- **Mô tả:** Nhận request xem lịch sử và điều hướng tới hàm `getEmployeeHistory`.

### 1.2 Triển khai Controller Logic
- **File:** `hrms-backend/controllers/attendanceController.js`
- **Hàm:** `getEmployeeHistory(req, res)`
- **Logic thực thi:**
  1. Đọc các tham số truy vấn (query params): `employeeId` (bắt buộc), `year`, `month`, `days` (các ngày cụ thể).
  2. Bắt lỗi nếu thiếu `employeeId`.
  3. Xử lý các giá trị mặc định: Nếu không truyền, lấy tháng và năm hiện tại.
  4. **Validation (Tối đa 3 năm):**
     - `year` không được lớn hơn năm hiện tại.
     - `year` không được nhỏ hơn `currentYear - 3`.
     - `month` phải từ 1 đến 12.
  5. **Tạo điều kiện truy vấn (Sequelize):**
     - `Op.between` cho khoảng thời gian của tháng, hoặc `Op.in` nếu có các ngày cụ thể.
     - Phải khớp trường `employeeId`.
  6. Include mô hình `Employee` để trả về thông tin tên và mã nhân viên.
  7. Sắp xếp thứ tự thời gian giảm dần (`DESC`).

## 2. Frontend (React/Vite)

### 2.1 Cập nhật Service API
- **File:** `hrms-frontend/src/services/attendance.ts`
- **Hàm bổ sung:** `getEmployeeHistory(employeeId: string, year: number, month: number, days?: string)`
- **Mô tả:** Fetch GET `/api/attendance/employee-history` kèm query params.

### 2.2 Cập nhật Giao diện (Tab Admin)
- **File:** `hrms-frontend/src/features/attendance/Attendance.tsx`
- **Thêm tính năng tra cứu vào giao diện Admin:** Thay thế tab "Lịch sử của tôi" thành tab "Tra cứu nhân viên (Admin)".
- **UI Lọc Dữ liệu:**
  - **Dropdown chọn nhân viên:** Tự động fetch `/api/employees` để admin chọn nhân viên cần xem.
  - Dropdown chọn Năm (4 năm gần nhất).
  - Dropdown chọn Tháng (1-12).
  - Input lọc ngày cụ thể.
- **Logic hoạt động:**
  - `useEffect` lắng nghe sự thay đổi của `selectedEmployeeId`, `year`, `month` để tự động load lại dữ liệu tương ứng.
  - Hiển thị danh sách kết quả (Có tên, giờ vào, ra, trạng thái).

## 3. Quy trình Kiểm thử
1. Đăng nhập với tài khoản bình thường (Employee) -> Truy cập URL gọi API, phải báo lỗi quyền "Access Denied".
2. Đăng nhập bằng Admin -> Thấy tab Tra cứu nhân viên.
3. Chọn một nhân viên -> Dữ liệu cập nhật đúng của người đó.
4. Chọn năm 4 năm trước -> Lỗi 400 hiển thị Toast "Chỉ xem tối đa 3 năm".
