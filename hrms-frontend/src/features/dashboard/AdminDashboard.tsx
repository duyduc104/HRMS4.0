import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, UserCheck, Clock, CalendarOff, TrendingUp,
  DollarSign, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { WeatherWidget } from '../../components/ui/WeatherWidget/WeatherWidget';
import { analyticsServices } from '../../services/analytics';
import { useAuthStore } from '../../stores/useAuthStore';
import { Sparkles, X, Loader2, PlayCircle, Zap } from 'lucide-react';
import { QuickEventModal } from './QuickEventModal';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Overview {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  onLeaveToday: number;
  absentToday: number;
  attendanceRate: number;
}
interface TrendPoint { date: string; label: string; present: number; late: number; absent: number }
interface PayrollPoint { month: number; label: string; totalNet: number; totalOT: number; headcount: number }
interface DeptPoint { department: string; rate: number; headcount: number }
interface LeaveSlice { name: string; value: number; color: string }

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: any; label: string; value: string | number; sub?: string; color: string; trend?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border border-border bg-surface shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-sec mb-1">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold mb-1 text-text-primary">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const { user } = useAuthStore();
  const [overview, setOverview]   = useState<Overview | null>(null);
  const [trend, setTrend]         = useState<TrendPoint[]>([]);
  const [payroll, setPayroll]     = useState<PayrollPoint[]>([]);
  const [deptData, setDeptData]   = useState<DeptPoint[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveSlice[]>([]);
  const [trendDays, setTrendDays] = useState(30);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // --- AI Insights State ---
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ insights: string[], suggestedActions: any[] } | null>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);

  const fetchAIInsights = async () => {
    setShowAIPanel(true);
    setAILoading(true);
    try {
      const res = await api.get('/analytics/ai-insights');
      if (res.status === 200) {
        setAiResult(res.data);
      } else {
        toast.error('Lỗi AI', res.data?.message || 'Không thể phân tích');
        setShowAIPanel(false);
      }
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không kết nối được AI');
      setShowAIPanel(false);
    } finally {
      setAILoading(false);
    }
  };

  const loadAll = useCallback(async (days = trendDays) => {
    setLoading(true);
    setError(null);
    try {
      const [ov, tr, pay, dept, lv] = await Promise.all([
        analyticsServices.getOverview(),
        analyticsServices.getAttendanceTrend(days),
        analyticsServices.getPayrollSummary(),
        analyticsServices.getDepartmentAttendance(),
        analyticsServices.getLeaveStats(),
      ]);
      setOverview(ov);
      setTrend(tr);
      setPayroll(pay);
      setDeptData(dept);
      setLeaveData(lv);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không thể tải dữ liệu analytics');
    } finally {
      setLoading(false);
    }
  }, [trendDays]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleTrendChange = (days: number) => {
    setTrendDays(days);
    loadAll(days);
  };

  const formatMillion = (v: number) => `${v}M`;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div>
          <p className="font-semibold text-text-primary">Không thể tải Dashboard</p>
          <p className="text-sm text-text-sec mt-1">{error}</p>
        </div>
        <Button variant="outline" onClick={() => loadAll()}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📊 Tổng quan Hệ thống</h1>
          <p className="text-sm text-text-sec mt-0.5 flex flex-wrap items-center gap-2">
            <span>Xin chào, <span className="font-medium text-text-primary">{user?.fullName}</span></span>
            <span className="hidden sm:inline">—</span>
            <span>Cập nhật lúc {lastRefresh.toLocaleTimeString('vi-VN')}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WeatherWidget />
          <Button
            className="self-start sm:self-auto bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 shadow-lg hover:shadow-indigo-500/25 transition-all"
            onClick={fetchAIInsights}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Phân Tích
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAll()}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Tổng nhân viên"
          value={loading ? '…' : overview?.totalEmployees ?? 0}
          sub="Đang hoạt động"
          color="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
        />
        <StatCard
          icon={UserCheck}
          label="Có mặt hôm nay"
          value={loading ? '…' : overview?.presentToday ?? 0}
          sub={`Tỷ lệ: ${overview?.attendanceRate ?? 0}%`}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          trend={overview ? `${overview.attendanceRate}% đúng giờ` : undefined}
        />
        <StatCard
          icon={Clock}
          label="Đi trễ hôm nay"
          value={loading ? '…' : overview?.lateToday ?? 0}
          sub="Cần xem xét"
          color="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          icon={CalendarOff}
          label="Đang nghỉ phép"
          value={loading ? '…' : overview?.onLeaveToday ?? 0}
          sub={`Vắng: ${overview?.absentToday ?? 0} người`}
          color="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
        />
      </div>

      {/* ── Row 2: Attendance Trend + Leave Pie ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance Area Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>Xu hướng Chấm công</CardTitle>
            <div className="flex gap-1">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => handleTrendChange(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    trendDays === d
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-alt text-text-sec hover:bg-brand-50 hover:text-brand-600'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-text-muted animate-pulse">
                Đang tải biểu đồ…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-sec)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-sec)' }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="present" name="Có mặt"  stroke="#6366f1" fill="url(#gPresent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="late"    name="Đi trễ"  stroke="#f59e0b" fill="url(#gLate)"    strokeWidth={2} />
                  <Area type="monotone" dataKey="absent"  name="Vắng"    stroke="#ef4444" fill="none"            strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Leave Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố Nghỉ phép năm nay</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-text-muted animate-pulse w-full">
                Đang tải…
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={leaveData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {leaveData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} đơn`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 w-full mt-1">
                  {leaveData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-text-sec">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Row 3: Payroll Bar + Department Rate ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Payroll Bar Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Chi phí Lương theo Tháng (triệu ₫)
            </CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-text-muted animate-pulse">Đang tải…</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={payroll} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-sec)' }} />
                  <YAxis tickFormatter={formatMillion} tick={{ fontSize: 11, fill: 'var(--color-text-sec)' }} />
                  <Tooltip
                    formatter={(v: any) => [`${v}M ₫`]}
                    content={<ChartTooltip />}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="totalNet" name="Thực nhận" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalOT"  name="Thưởng OT"  fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Department Attendance Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Tỷ lệ Chấm công theo Phòng ban (tháng này)</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-text-muted animate-pulse">Đang tải…</div>
            ) : deptData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-text-muted text-sm">
                Chưa có dữ liệu phòng ban
              </div>
            ) : (
              <div className="space-y-4">
                {deptData
                  .sort((a, b) => b.rate - a.rate)
                  .map((dept) => {
                    const color =
                      dept.rate >= 90 ? 'bg-emerald-500' :
                      dept.rate >= 75 ? 'bg-brand-500' :
                      dept.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                    return (
                      <div key={dept.department}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium truncate max-w-[60%]">{dept.department}</span>
                          <div className="flex items-center gap-2 text-xs text-text-sec">
                            <span>{dept.headcount} NV</span>
                            <span className="font-bold text-text-primary">{dept.rate}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-surface-alt rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${color}`}
                            style={{ width: `${dept.rate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* --- AI INSIGHTS PANEL --- */}
      {showAIPanel && (
        <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-surface shadow-[-4px_0_24px_rgba(0,0,0,0.1)] border-l border-border flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
            <h3 className="font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
              AI Phân Tích & Đề Xuất
            </h3>
            <button onClick={() => setShowAIPanel(false)} className="text-text-sec hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1 bg-bg space-y-6">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-text-sec space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <Sparkles className="w-4 h-4 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="animate-pulse font-medium text-sm">AI đang đọc dữ liệu hệ thống...</p>
              </div>
            ) : aiResult ? (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-text-sec flex items-center gap-2 uppercase tracking-wider">
                    <Zap className="w-4 h-4" /> Nhận xét tổng quan
                  </h4>
                  {aiResult.insights.map((insight, idx) => (
                    <div key={idx} className="p-3 bg-surface border border-border rounded-xl shadow-sm text-sm">
                      {insight}
                    </div>
                  ))}
                </div>

                {aiResult.suggestedActions && aiResult.suggestedActions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="text-sm font-bold text-text-sec flex items-center gap-2 uppercase tracking-wider">
                      <PlayCircle className="w-4 h-4" /> Hành động đề xuất
                    </h4>
                    {aiResult.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAction(action)}
                        className="w-full text-left p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group"
                      >
                        <p className="font-bold mb-1 group-hover:text-white/90">{action.label}</p>
                        <p className="text-xs text-white/70 line-clamp-1">{action.prefill.title}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* --- QUICK EVENT MODAL --- */}
      {selectedAction && (
        <QuickEventModal 
          isOpen={true} 
          onClose={() => setSelectedAction(null)} 
          action={selectedAction} 
        />
      )}
    </div>
  );
}
