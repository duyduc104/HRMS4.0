const bcrypt = require('bcryptjs');
const { 
  sequelize, 
  Employee, 
  Role, 
  Department, 
  Leave, 
  AttendanceExplanation, 
  Salary 
} = require('../models');

async function seedData() {
  try {
    console.log('🔄 Bắt đầu tạo dữ liệu mẫu kiểm thử phê duyệt đa cấp theo Role...');
    await sequelize.authenticate();

    // 0. Chạy migration đảm bảo các cột duyệt và gỡ check constraints
    const runApprovalMigration = require('../utils/approvalMigration');
    await runApprovalMigration();

    // 1. Đảm bảo các Role hệ thống tồn tại
    const rolesList = ['admin', 'hr_manager', 'department_manager', 'employee'];
    const roleMap = {};
    for (const rName of rolesList) {
      const [r] = await Role.findOrCreate({
        where: { name: rName },
        defaults: { description: `Vai trò ${rName}` }
      });
      roleMap[rName] = r;
    }
    console.log('✅ Đã xác nhận các Role hệ thống.');

    // 2. Tạo các phòng ban mẫu
    const depts = [
      { name: 'Ban Giám Đốc', description: 'Ban Lãnh đạo điều hành công ty' },
      { name: 'Phòng Nhân sự', description: 'Quản trị nhân lực, tuyển dụng và chế độ chính sách' },
      { name: 'Phòng Công nghệ thông tin', description: 'Nghiên cứu phát triển phần mềm và hạ tầng CNTT' },
      { name: 'Phòng Kinh doanh', description: 'Phát triển thị trường, kinh doanh và bán hàng' }
    ];

    for (const d of depts) {
      await Department.findOrCreate({
        where: { name: d.name },
        defaults: { description: d.description, isDeleted: false }
      });
    }
    console.log('✅ Đã xác nhận các phòng ban mẫu.');

    // 3. Chuẩn bị mật khẩu băm '12345678'
    const passwordHash = await bcrypt.hash('12345678', 10);

    // 4. Danh sách tài khoản nhân viên theo từng cấp bậc
    const employeesData = [
      // === CẤP 3: BAN GIÁM ĐỐC / ADMIN ===
      {
        code: 'EMP-ADMIN01',
        username: 'admin',
        fullName: 'Nguyễn Văn Ban Giám Đốc',
        email: 'admin.hrms@company.vn',
        department: 'Ban Giám Đốc',
        position: 'Giám đốc Điều hành (CEO)',
        role: 'admin',
        roles: ['admin', 'employee']
      },
      // === CẤP 2: NHÂN SỰ / HR MANAGER ===
      {
        code: 'EMP-HR01',
        username: 'hr_manager',
        fullName: 'Trần Thị Thu HR',
        email: 'thu.hr@company.vn',
        department: 'Phòng Nhân sự',
        position: 'Trưởng phòng Nhân sự',
        role: 'hr_manager',
        roles: ['hr_manager', 'employee']
      },
      // === CẤP 1: TRƯỞNG PHÒNG CNTT ===
      {
        code: 'EMP-IT01',
        username: 'manager_it',
        fullName: 'Lê Văn Trưởng Phòng IT',
        email: 'manager.it@company.vn',
        department: 'Phòng Công nghệ thông tin',
        position: 'Trưởng phòng CNTT',
        role: 'department_manager',
        roles: ['department_manager', 'employee']
      },
      // === CẤP 1: TRƯỞNG PHÒNG KINH DOANH ===
      {
        code: 'EMP-SALES01',
        username: 'manager_sales',
        fullName: 'Phạm Thị Trưởng Phòng KD',
        email: 'manager.sales@company.vn',
        department: 'Phòng Kinh doanh',
        position: 'Trưởng phòng Kinh doanh',
        role: 'department_manager',
        roles: ['department_manager', 'employee']
      },
      // === NHÂN VIÊN PHÒNG CNTT 1 ===
      {
        code: 'EMP-IT02',
        username: 'dev_an',
        fullName: 'Hoàng Văn An (Dev IT)',
        email: 'an.hoang@company.vn',
        department: 'Phòng Công nghệ thông tin',
        position: 'Kỹ sư phần mềm Fullstack',
        role: 'employee',
        roles: ['employee']
      },
      // === NHÂN VIÊN PHÒNG CNTT 2 ===
      {
        code: 'EMP-IT03',
        username: 'dev_binh',
        fullName: 'Đỗ Thị Bình (QA IT)',
        email: 'binh.do@company.vn',
        department: 'Phòng Công nghệ thông tin',
        position: 'Chuyên viên kiểm thử QA/QC',
        role: 'employee',
        roles: ['employee']
      },
      // === NHÂN VIÊN PHÒNG KINH DOANH 1 ===
      {
        code: 'EMP-SALES02',
        username: 'sale_cuong',
        fullName: 'Vũ Quốc Cường (Sales)',
        email: 'cuong.vu@company.vn',
        department: 'Phòng Kinh doanh',
        position: 'Chuyên viên Kinh doanh B2B',
        role: 'employee',
        roles: ['employee']
      },
      // === NHÂN VIÊN PHÒNG KINH DOANH 2 ===
      {
        code: 'EMP-SALES03',
        username: 'sale_dung',
        fullName: 'Bùi Mỹ Dung (Sales)',
        email: 'dung.bui@company.vn',
        department: 'Phòng Kinh doanh',
        position: 'Trưởng nhóm Telesales',
        role: 'employee',
        roles: ['employee']
      }
    ];

    const createdEmployees = {};

    for (const empData of employeesData) {
      let emp = await Employee.findOne({ where: { username: empData.username } });
      if (emp) {
        // Cập nhật lại thông tin & password
        await emp.update({
          fullName: empData.fullName,
          department: empData.department,
          position: empData.position,
          passwordHash: passwordHash,
          faceEncoding: null,
          faceEncodingIV: null,
          isDeleted: false,
          status: 'active'
        });
      } else {
        emp = await Employee.create({
          code: empData.code,
          username: empData.username,
          fullName: empData.fullName,
          email: empData.email,
          department: empData.department,
          position: empData.position,
          passwordHash: passwordHash,
          faceEncoding: null,
          faceEncodingIV: null,
          status: 'active',
          joinDate: new Date(),
          isDeleted: false
        });
      }

      // Gán role
      const rolesToAssign = empData.roles.map(rName => roleMap[rName]).filter(Boolean);
      await emp.setRoles(rolesToAssign);

      // Đảm bảo có Salary record mẫu
      await Salary.findOrCreate({
        where: { employeeId: emp.id },
        defaults: {
          baseSalary: 15000000,
          hourlyRate: 50000,
          allowance: 1000000,
          bankName: 'MB Bank',
          bankAccount: '9999' + Math.floor(100000 + Math.random() * 900000)
        }
      });

      createdEmployees[empData.username] = emp;
      console.log(`👤 Đã tạo/cập nhật user: ${empData.username.padEnd(15)} | Role: ${empData.role.padEnd(20)} | Phòng: ${empData.department}`);
    }

    // 5. Tạo dữ liệu mẫu cho đơn Nghỉ phép (Leave) ở từng cấp phê duyệt
    const adminUser = createdEmployees['admin'];
    const hrUser = createdEmployees['hr_manager'];
    const itManager = createdEmployees['manager_it'];
    const salesManager = createdEmployees['manager_sales'];
    const devAn = createdEmployees['dev_an'];
    const devBinh = createdEmployees['dev_binh'];
    const saleCuong = createdEmployees['sale_cuong'];
    const saleDung = createdEmployees['sale_dung'];

    // Xoá các đơn test cũ của các nhân viên test để tạo mới sạch đẹp
    const testEmpIds = Object.values(createdEmployees).map(e => e.id);
    await Leave.destroy({ where: { employeeId: testEmpIds } });
    await AttendanceExplanation.destroy({ where: { employeeId: testEmpIds } });

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const nextWeekStart = new Date(now);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekEnd = new Date(now);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 8);

    // Đơn 1: Dev An (Phòng CNTT) gửi đơn -> Trạng thái 'Pending' (Chờ Trưởng phòng IT manager_it duyệt Cấp 1)
    await Leave.create({
      employeeId: devAn.id,
      leaveType: 'Annual',
      startDate: tomorrow,
      endDate: dayAfter,
      reason: 'Xin nghỉ phép giải quyết việc gia đình ở quê',
      status: 'Pending'
    });

    // Đơn 2: Dev Bình (Phòng CNTT) -> Trạng thái 'Pending_HR' (Trưởng phòng IT đã duyệt Cấp 1, chờ HR hr_manager duyệt Cấp 2)
    await Leave.create({
      employeeId: devBinh.id,
      leaveType: 'Sick',
      startDate: nextWeekStart,
      endDate: nextWeekEnd,
      reason: 'Đi khám sức khỏe định kỳ theo lịch hẹn của bệnh viện',
      status: 'Pending_HR',
      managerApprovedBy: itManager.id,
      managerApprovedAt: new Date()
    });

    // Đơn 3: Sale Dung (Phòng KD) -> Trạng thái 'Pending_Admin' (Trưởng phòng KD & HR đã duyệt, chờ Ban Giám Đốc admin duyệt Cấp 3)
    await Leave.create({
      employeeId: saleDung.id,
      leaveType: 'Personal',
      startDate: tomorrow,
      endDate: dayAfter,
      reason: 'Về quê dự đám cưới em gái ruột',
      status: 'Pending_Admin',
      managerApprovedBy: salesManager.id,
      managerApprovedAt: new Date(),
      hrApprovedBy: hrUser.id,
      hrApprovedAt: new Date()
    });

    // Đơn 4: Trưởng phòng IT (manager_it) tự nộp đơn -> Trạng thái 'Pending_HR' (Tự động vượt cấp TP, chờ HR duyệt)
    await Leave.create({
      employeeId: itManager.id,
      leaveType: 'Annual',
      startDate: nextWeekStart,
      endDate: nextWeekEnd,
      reason: 'Nghỉ phép thường niên cùng gia đình',
      status: 'Pending_HR'
    });

    // Đơn 5: Sale Cường (Phòng KD) -> Trạng thái 'Approved' (Đã duyệt hoàn tất)
    await Leave.create({
      employeeId: saleCuong.id,
      leaveType: 'Annual',
      startDate: tomorrow,
      endDate: tomorrow,
      reason: 'Nghỉ giải quyết thủ tục hành chính',
      status: 'Approved',
      managerApprovedBy: salesManager.id,
      managerApprovedAt: new Date(),
      hrApprovedBy: hrUser.id,
      hrApprovedAt: new Date(),
      approvedBy: adminUser.id
    });

    console.log('✅ Đã tạo 5 đơn Nghỉ phép mẫu ở các cấp (Pending, Pending_HR, Pending_Admin, Approved).');

    // 6. Tạo dữ liệu mẫu cho Giải trình chấm công (AttendanceExplanation) ở từng cấp
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    // Giải trình 1: Dev An -> Trạng thái 'Pending' (Chờ Trưởng phòng IT duyệt Cấp 1)
    await AttendanceExplanation.create({
      employeeId: devAn.id,
      date: yesterdayStr,
      type: 'Late',
      reason: 'Mưa to kẹt xe ngã tư Hàng Xanh lúc 8h sáng, đến muộn 15 phút',
      status: 'Pending'
    });

    // Giải trình 2: Dev Bình -> Trạng thái 'Pending_HR' (Trưởng phòng IT đã duyệt Cấp 1, chờ HR duyệt Cấp 2)
    await AttendanceExplanation.create({
      employeeId: devBinh.id,
      date: twoDaysAgoStr,
      type: 'Missing_Punch',
      reason: 'Lên văn phòng gặp khách hàng đối tác gấp nên quên quẹt thẻ lúc check-in buổi sáng',
      status: 'Pending_HR',
      managerApprovedBy: itManager.id,
      managerApprovedAt: new Date()
    });

    // Giải trình 3: Sale Cường -> Trạng thái 'Pending_Admin' (Đã qua Trưởng phòng KD và HR duyệt, chờ Admin duyệt chốt Cấp 3)
    await AttendanceExplanation.create({
      employeeId: saleCuong.id,
      date: threeDaysAgoStr,
      type: 'Leave_Early',
      reason: 'Đi gặp khách hàng doanh nghiệp ký kết hợp đồng ngoài giờ lúc 16:30 chiều',
      status: 'Pending_Admin',
      managerApprovedBy: salesManager.id,
      managerApprovedAt: new Date(),
      hrApprovedBy: hrUser.id,
      hrApprovedAt: new Date()
    });

    console.log('✅ Đã tạo 3 đơn Giải trình chấm công mẫu ở các cấp (Pending, Pending_HR, Pending_Admin).');

    console.log('\n🎉 =======================================================');
    console.log('🎉 TẠO DỮ LIỆU KIỂM THỬ THÀNH CÔNG RỰC RỠ!');
    console.log('🎉 TẤT CẢ TÀI KHOẢN ĐỀU CÓ MẬT KHẨU LÀ: 12345678');
    console.log('🎉 =======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  }
}

seedData();
