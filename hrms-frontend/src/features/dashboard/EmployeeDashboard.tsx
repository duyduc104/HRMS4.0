import { useState, useEffect } from 'react';
import { Clock, Calendar as CalendarIcon, FileText, CheckCircle, Briefcase, Activity, CalendarClock, ArrowRight, User } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Badge } from '../../components/ui/Badge/Badge';
import { WeatherWidget } from '../../components/ui/WeatherWidget/WeatherWidget';
import { Button } from '../../components/ui/Button/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { leaveServices } from '../../services/leave';
import { attendanceServices } from '../../services/attendance';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { formatTime } from '../../utils/format';

export function EmployeeDashboard() {
  const { user } = useAuthStore();
  const [time, setTime] = useState(new Date());
  
  // Data States
  const [annualUsed, setAnnualUsed] = useState(0);
  const [latestPayslip, setLatestPayslip] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);

  // 1. Đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Gọi các API cần thiết
  useEffect(() => {
    // 2.1 Fetch Ngày phép & Lịch sử đơn phép
    leaveServices.getMyLeaves().then(leaves => {
      // Tính ngày phép đã dùng
      const used = leaves
        .filter((l: any) => l.leaveType === 'Annual' && (l.status === 'Approved' || l.status === 'Pending'))
        .reduce((total: number, l: any) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          const diffDays = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
          
          let days = 1;
          if (diffDays === 0) {
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            days = hours <= 4.5 ? 0.5 : 1;
          } else {
            days = diffDays + 1;
          }
          return total + days;
        }, 0);
      setAnnualUsed(used);

      // Lấy 3 đơn phép gần nhất
      const sortedLeaves = [...leaves].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentLeaves(sortedLeaves.slice(0, 3));
    }).catch(console.error);

    // 2.2 Fetch Phiếu lương gần nhất
    api.get('/payroll/me').then(res => {
      const payslips = Array.isArray(res.data) ? res.data : (res.data.payrolls || []);
      const validPayslips = payslips.filter((p: any) => p.status === 'Approved' || p.status === 'Paid');
      if (validPayslips.length > 0) {
        validPayslips.sort((a: any, b: any) => {
          if (a.periodYear !== b.periodYear) return b.periodYear - a.periodYear;
          return b.periodMonth - a.periodMonth;
        });
        setLatestPayslip(validPayslips[0]);
      }
    }).catch(console.error);

    // 2.3 Fetch Điểm danh hôm nay
    attendanceServices.getToday().then(res => {
      setTodayAttendance(res.attendance);
    }).catch(console.error);

  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const getLeaveStatusBadge = (status: string) => {
    if (status === 'Approved') return <Badge variant="active">Đã duyệt</Badge>;
    if (status === 'Rejected') return <Badge variant="danger">Từ chối</Badge>;
    return <Badge variant="pending">Chờ duyệt</Badge>;
  };

  const leavePercentage = Math.min((annualUsed / 12) * 100, 100);
  const remainingLeaves = Math.max(12 - annualUsed, 0);

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-800 text-white shadow-xl shadow-brand-500/20">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-brand-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3">
              {getGreeting()}, {user?.fullName || user?.name || 'Bạn'}! <span className="animate-wave inline-block origin-[70%_70%]">👋</span>
            </h1>
            <p className="text-brand-100 mb-6 text-lg">
              Hôm nay là {time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full text-sm font-medium">
              {todayAttendance?.checkInTime ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
                  <span>Đã Check-in lúc {formatTime(todayAttendance.checkInTime)}</span>
                </>
              ) : (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <span>Bạn chưa chấm công hôm nay</span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 scale-110 md:scale-100 transform origin-right">
            <WeatherWidget />
          </div>
        </div>
      </div>

      {/* 2. METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Chấm công */}
        <Card className="hover:shadow-lg transition-all duration-300 border-t-4 border-t-blue-500">
          <CardBody className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <Badge variant="default" className="bg-blue-100 text-blue-700">Hôm nay</Badge>
            </div>
            <h3 className="text-text-sec font-medium mb-1">Giờ làm việc</h3>
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Check-in</p>
                <p className="text-xl font-bold">{todayAttendance?.checkInTime ? formatTime(todayAttendance.checkInTime) : '--:--'}</p>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-right">
                <p className="text-xs text-text-muted mb-1">Check-out</p>
                <p className="text-xl font-bold">{todayAttendance?.checkOutTime ? formatTime(todayAttendance.checkOutTime) : '--:--'}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Ngày phép */}
        <Card className="hover:shadow-lg transition-all duration-300 border-t-4 border-t-emerald-500">
          <CardBody className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <Link to="/leave" className="text-xs font-medium text-emerald-600 hover:underline">Chi tiết &rarr;</Link>
            </div>
            <h3 className="text-text-sec font-medium mb-4">Quỹ phép năm</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-emerald-600">{remainingLeaves}</p>
                <p className="text-xs text-text-muted">Ngày còn lại</p>
              </div>
              
              {/* Circular Progress */}
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-alt stroke-current"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 stroke-current"
                    strokeWidth="3"
                    strokeDasharray={`${leavePercentage}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {annualUsed}/12
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Lương */}
        <Card className="hover:shadow-lg transition-all duration-300 border-t-4 border-t-purple-500 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Briefcase className="w-32 h-32" />
          </div>
          <CardBody className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              {latestPayslip && (
                <Badge variant={latestPayslip.status === 'Paid' ? 'active' : 'default'} className="bg-purple-100 text-purple-700">
                  Tháng {latestPayslip.periodMonth}/{latestPayslip.periodYear}
                </Badge>
              )}
            </div>
            <h3 className="text-text-sec font-medium mb-1">Thực nhận gần nhất</h3>
            {latestPayslip ? (
              <div className="mt-4">
                <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-brand-500">
                  {latestPayslip.netSalary ? parseInt(latestPayslip.netSalary).toLocaleString('vi-VN') : (parseInt(latestPayslip.baseSalary || 0) + parseInt(latestPayslip.overtimePay || 0) - parseInt(latestPayslip.deductions || 0)).toLocaleString('vi-VN')} ₫
                </p>
                <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {latestPayslip.status === 'Paid' ? 'Đã thanh toán' : 'Đã duyệt, chờ thanh toán'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted mt-4">Chưa có dữ liệu lương.</p>
            )}
          </CardBody>
        </Card>

      </div>

      {/* 3. DETAILS & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lịch sử hoạt động (Cột lớn) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row justify-between items-center border-b border-border pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-500" />
              Đơn nghỉ phép gần đây
            </CardTitle>
            <Link to="/leave">
              <Button variant="ghost" size="sm" className="text-brand-600">Xem tất cả</Button>
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {recentLeaves.length > 0 ? (
              <div className="divide-y divide-border">
                {recentLeaves.map((leave, idx) => (
                  <div key={idx} className="p-4 hover:bg-surface-alt transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center text-text-sec border border-border">
                        <CalendarClock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">Nghỉ {leave.leaveType === 'Annual' ? 'Phép năm' : leave.leaveType}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date(leave.startDate).toLocaleDateString('vi-VN')} - {new Date(leave.endDate).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div>
                      {getLeaveStatusBadge(leave.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted">
                Bạn chưa gửi đơn xin nghỉ nào gần đây.
              </div>
            )}
          </CardBody>
        </Card>

        {/* Thao tác nhanh (Grid 2x2) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2 px-1">
            Thao tác nhanh
          </h3>
          <div className="grid grid-cols-2 gap-4">
            
            <Link to="/leave" className="group block">
              <div className="h-full p-4 rounded-2xl border border-border bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:border-emerald-200 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm">Xin nghỉ phép</p>
              </div>
            </Link>

            <Link to="/payroll" className="group block">
              <div className="h-full p-4 rounded-2xl border border-border bg-surface hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-200 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm">Xem phiếu lương</p>
              </div>
            </Link>

            <Link to="/attendance" className="group block">
              <div className="h-full p-4 rounded-2xl border border-border bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm">Lịch sử chấm công</p>
              </div>
            </Link>

            <Link to="/profile" className="group block">
              <div className="h-full p-4 rounded-2xl border border-border bg-surface hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:border-amber-200 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm">Hồ sơ cá nhân</p>
              </div>
            </Link>

          </div>
          
          <Card className="bg-brand-50/50 dark:bg-brand-900/10 border-brand-200 mt-4 overflow-hidden">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-700 dark:text-brand-400">Bạn cần hỗ trợ?</p>
                <p className="text-xs text-brand-600/70 mt-0.5">Hỏi đáp với HR Bot</p>
              </div>
              <Button size="sm" variant="outline" className="border-brand-300 text-brand-600 rounded-full px-3">
                Chat ngay <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
}
