import api from './api';

// Service giao tiep API thong ke bao cao va chi so nhan su toan cong ty

export const analyticsServices = {
  // Ham nay dung de lay so lieu tong quan (tong so NV, so nguoi di lam, so nguoi di tre, so nguoi nghi phep)
  getOverview: () =>
    api.get('/analytics/overview').then(r => r.data),

  // Ham nay dung de lay xu huong cham cong theo chuoi ngay gan nhat (7 hoac 30 ngay)
  getAttendanceTrend: (days = 30) =>
    api.get(`/analytics/attendance-trend?days=${days}`).then(r => r.data),

  // Ham nay dung de lay tong hop chi phi quy luong theo 12 thang trong nam
  getPayrollSummary: (year?: number) =>
    api.get(`/analytics/payroll-summary?year=${year || new Date().getFullYear()}`).then(r => r.data),

  // Ham nay dung de lay ty le chuyen can di lam theo tung phong ban trong thang
  getDepartmentAttendance: () =>
    api.get('/analytics/department-attendance').then(r => r.data),

  // Ham nay dung de lay ty le phan bo cac loai trang thai don nghi phep
  getLeaveStats: () =>
    api.get('/analytics/leave-stats').then(r => r.data),
};
