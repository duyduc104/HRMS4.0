import api from './api';

export const analyticsServices = {
  getOverview: () =>
    api.get('/analytics/overview').then(r => r.data),

  getAttendanceTrend: (days = 30) =>
    api.get(`/analytics/attendance-trend?days=${days}`).then(r => r.data),

  getPayrollSummary: (year?: number) =>
    api.get(`/analytics/payroll-summary?year=${year || new Date().getFullYear()}`).then(r => r.data),

  getDepartmentAttendance: () =>
    api.get('/analytics/department-attendance').then(r => r.data),

  getLeaveStats: () =>
    api.get('/analytics/leave-stats').then(r => r.data),
};
