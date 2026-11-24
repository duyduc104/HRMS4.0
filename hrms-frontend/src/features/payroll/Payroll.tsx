import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, ArrowUpRight, ArrowDownRight, Printer, FileCheck, Download, Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';
import { leaveServices } from '../../services/leave';
import { useAuthStore } from '../../stores/useAuthStore';
import { AdvanceRequest } from './AdvanceRequest';
import { formatCurrency, formatTime, formatDate } from '../../utils/format';

export function Payroll() {
  const { user } = useAuthStore();
  
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [selectedPeriod, setSelectedPeriod] = useState(`${currentMonth}/${currentYear}`);
  const [activeTab, setActiveTab] = useState<'payroll' | 'advance' | 'explanations'>('payroll');
  
  const [pendingExplanations, setPendingExplanations] = useState<any[]>([]);
  const [explanationApproveModal, setExplanationApproveModal] = useState<any>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [simulateRequest, setSimulateRequest] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [editAdvanceModal, setEditAdvanceModal] = useState<{ item: any; amount: string } | null>(null);

  const userRole = (user?.role || '').toLowerCase().replace(/\s+/g, '_');
  const userRoles = (user?.roles || []).map((r: any) => 
    (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
  );
  const allRoles = [...new Set([userRole, ...userRoles])];
  const isAdminOrHR = allRoles.some(r => ['admin', 'hr_manager', 'accountant'].includes(r));
  const canManage = isAdminOrHR;

  const [explanationModal, setExplanationModal] = useState<{ date: string } | null>(null);
  const [explanationReason, setExplanationReason] = useState('');
  const [explanationType, setExplanationType] = useState('Missing_Punch');

  // Generate 12 months for the current year (descending)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = String(12 - i).padStart(2, '0');
    return `${m}/${currentYear}`;
  });

  const handleSelectAll = (checked: boolean) => {

    
    if (checked) {
      setSelectedIds(payrolls.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      const [month, year] = selectedPeriod.split('/');
      
      if (isAdminOrHR) {
        const endpoint = `/payroll?month=${month}&year=${year}`;
        const res = await api.get(endpoint);
        setPayrolls(res.data);
      } else {
        const endpoint = `/payroll/me`;
        const res = await api.get(endpoint);
        const filtered = res.data.filter((p: any) => `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}` === selectedPeriod);
        setPayrolls(filtered);

        if (filtered.length > 0) {
          setLoadingDetails(true);
          try {
            const attRes = await api.get(`/attendance/employee-history?employeeId=${user?.id}&month=${month}&year=${year}`);
            const validAttendances = attRes.data.records.filter((r: any) => ['Present', 'Late', 'Half-day'].includes(r.status));
            setAttendanceDetails(validAttendances.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            
            const advRes = await api.get(`/advance-requests/me?month=${month}&year=${year}`);
            setAdvanceDetails(advRes.data.filter((r: any) => r.status === 'Approved'));
          } catch {
            console.error('Error fetching details');
          }
          setLoadingDetails(false);
        } else {
          setAttendanceDetails([]);
          setAdvanceDetails([]);
        }
      }
      setSelectedIds([]);
    } catch {
      toast.error('Lỗi', 'Không thể tải bảng lương');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, user]);

  const fetchPendingExplanations = useCallback(async () => {
    if (!isAdminOrHR) return;
    try {
      const explanations = await leaveServices.getPendingExplanations();
      setPendingExplanations(explanations);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchPayroll();
    fetchPendingExplanations();
  }, [fetchPayroll, fetchPendingExplanations]);


  const calculateStats = () => {
    const totalGross = payrolls.reduce((sum, p) => sum + Number(p.baseSalary) + Number(p.allowance) + Number(p.overtimePay), 0);
    const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.deductions) + Number(p.tax) + Number(p.advancePayment || 0), 0);
    return [
      { label: 'Tổng lương Gross', value: formatCurrency(totalGross), trend: 'Theo dữ liệu', up: true },
      { label: 'Tổng lương Net', value: formatCurrency(totalNet), trend: 'Thực tế', up: true },
      { label: 'Tổng khấu trừ & Ứng', value: formatCurrency(totalDeductions), trend: 'Chính xác', up: false },
      { label: 'Số phiếu lương', value: payrolls.length.toString(), trend: 'Nhân sự', up: true },
    ];
  };

  const stats = calculateStats();

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEmployeePayroll, setSelectedEmployeePayroll] = useState<any>(null);
  const [attendanceDetails, setAttendanceDetails] = useState<any[]>([]);
  const [advanceDetails, setAdvanceDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const openDetails = async (item: any) => {
    setSelectedEmployeePayroll(item);
    setDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const [month, year] = selectedPeriod.split('/');
      const res = await api.get(`/attendance/employee-history?employeeId=${item.employeeId}&month=${Number(month)}&year=${Number(year)}`);
      const validAttendances = res.data.records.filter((r: any) => ['Present', 'Late', 'Half-day'].includes(r.status));
      setAttendanceDetails(validAttendances.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      
      const advRes = await api.get(`/advance-requests?employeeId=${item.employeeId}&month=${Number(month)}&year=${Number(year)}`);
      setAdvanceDetails(advRes.data.filter((r: any) => r.status === 'Approved'));
    } catch {
      toast.error('Lỗi', 'Không thể tải chi tiết chấm công');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateAdvance = (item: any) => {
    setEditAdvanceModal({ item, amount: item.advancePayment?.toString() || '0' });
  };

  const submitUpdateAdvance = async () => {
    if (!editAdvanceModal) return;
    const { item, amount } = editAdvanceModal;
    const numVal = parseFloat(amount.replace(/,/g, ''));
    if (!isNaN(numVal)) {
      try {
        await api.put(`/payroll/${item.id}/advance`, { advancePayment: numVal });
        toast.success('Thành công', 'Đã cập nhật ứng lương');
        fetchPayroll();
        setEditAdvanceModal(null);
      } catch {
        toast.error('Lỗi', 'Không thể cập nhật ứng lương');
      }
    } else {
      toast.error('Lỗi', 'Số tiền không hợp lệ');
    }
  };

  const columns: ColumnDef<any>[] = [];

  if (canManage) {
    columns.push({
      accessor: 'selection',
      label: (
        <input 
          type="checkbox" 
          className="rounded border-border text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
          checked={payrolls.length > 0 && selectedIds.length === payrolls.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      width: '40px',
      render: (item) => (
        <input 
          type="checkbox" 
          className="rounded border-border text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
          checked={selectedIds.includes(item.id)}
          onChange={(e) => handleSelect(item.id, e.target.checked)}
        />
      )
    });
  }

  columns.push(
    { accessor: 'employee', label: 'Nhân viên', render: (item) => <span className="font-medium">{item.employee?.fullName || user?.fullName}</span> },
    { accessor: 'baseSalary', label: 'Lương cơ bản', render: (item) => <span className="font-mono">{formatCurrency(item.baseSalary)}</span> },
    { accessor: 'hours', label: 'Số giờ làm', render: (item) => <span className="font-mono text-brand-600">{Number(item.workedHours || 0).toFixed(1)} h</span> },
    { accessor: 'allowance', label: 'Phụ cấp', render: (item) => <span className="font-mono">{formatCurrency(item.allowance)}</span> },
    { accessor: 'overtimePay', label: 'OT (VNĐ)', render: (item) => <span className="font-mono text-green-600">{formatCurrency(item.overtimePay)}</span> },
    { accessor: 'deductions', label: 'Khấu trừ', render: (item) => <span className="font-mono text-red-500">{formatCurrency(Number(item.deductions) + Number(item.tax))}</span> },
    { accessor: 'advancePayment', label: 'Ứng lương', render: (item) => (
      <div className="flex items-center gap-2 group">
        <span className="font-mono text-orange-500">{formatCurrency(item.advancePayment)}</span>
        {canManage ? (
          <button 
            onClick={() => handleUpdateAdvance(item)}
            className="opacity-0 group-hover:opacity-100 text-xs text-brand-500 hover:underline"
          >
            Sửa
          </button>
        ) : null}
      </div>
    )},
    { accessor: 'netSalary', label: 'Thực nhận', render: (item) => <span className="font-mono font-bold text-brand-600">{formatCurrency(item.netSalary)}</span> },
    { accessor: 'status', label: 'Trạng thái', render: (item) => {
      let badgeClass = 'bg-yellow-100 text-yellow-700';
      let label = 'Chờ duyệt';
      if (item.status === 'Approved') {
         badgeClass = 'bg-blue-100 text-blue-700';
         label = 'Đã duyệt';
      } else if (item.status === 'Paid') {
         badgeClass = 'bg-green-100 text-green-700 border border-green-200';
         label = 'Đã thanh toán';
      }
      return <span className={`px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap inline-block ${badgeClass}`}>{label}</span>;
    }},
    {
      accessor: 'actions',
      label: '',
      render: (item) => (
        <div className="flex gap-2 items-center flex-nowrap">
          {item.status === 'Approved' && canManage && (
            <Button variant="primary" size="sm" className="whitespace-nowrap flex-shrink-0" onClick={() => setSimulateRequest(item)}>
              Giải ngân
            </Button>
          )}
          <Button variant="ghost" size="sm" className="whitespace-nowrap flex-shrink-0" onClick={() => openDetails(item)}>
            <FileCheck className="w-4 h-4 mr-1" /> Chi tiết
          </Button>
        </div>
      )
    }
  );

  const handleCalculatePayroll = async () => {
    try {
      setCalculating(true);
      const [month, year] = selectedPeriod.split('/');
      const payload: any = { month: Number(month), year: Number(year) };
      
      // If some rows are selected, only recalculate for those employees
      if (selectedIds.length > 0) {
        const selectedEmployees = payrolls.filter(p => selectedIds.includes(p.id)).map(p => p.employeeId);
        payload.employeeIds = selectedEmployees;
      }

      const res = await api.post('/payroll/calculate', payload);
      toast.success('Thành công', res.data.message);
      fetchPayroll();
    } catch {
      toast.error('Thất bại', 'Lỗi khi tính toán bảng lương');
    } finally {
      setCalculating(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!simulateRequest) return;
    try {
      setIsSimulating(true);
      await api.post('/sepay/webhook', {
        isSimulation: true,
        transferType: 'out',
        transferAmount: simulateRequest.netSalary,
        content: `L${simulateRequest.id}`
      });
      toast.success('Thành công', 'Đã mô phỏng thanh toán qua SePay');
      setSimulateRequest(null);
      fetchPayroll();
    } catch {
      toast.error('Thất bại', 'Lỗi khi mô phỏng thanh toán');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApprovePayroll = async () => {
    try {
      const [month, year] = selectedPeriod.split('/');
      const payload: any = { month: Number(month), year: Number(year) };
      
      // If some rows are selected, only approve those
      if (selectedIds.length > 0) {
        payload.payrollIds = selectedIds;
      }

      const res = await api.post('/payroll/approve-all', payload);
      toast.success('Thành công', res.data.message);
      fetchPayroll();
    } catch {
      toast.error('Thất bại', 'Lỗi khi duyệt bảng lương');
    }
  };

  const handleBulkSimulatePayment = async () => {
    let toSimulate = payrolls.filter(p => p.status === 'Approved');
    if (selectedIds.length > 0) {
      toSimulate = toSimulate.filter(p => selectedIds.includes(p.id));
    }
    
    if (toSimulate.length === 0) {
      toast.error('Lỗi', 'Không có phiếu lương nào hợp lệ để thanh toán.');
      return;
    }

    try {
      setIsSimulating(true);
      let count = 0;
      for (const p of toSimulate) {
        await api.post('/sepay/webhook', {
          isSimulation: true,
          transferType: 'out',
          transferAmount: p.netSalary,
          content: `L${p.id}`
        });
        count++;
      }
      toast.success('Thành công', `Đã mô phỏng thanh toán cho ${count} phiếu lương`);
      fetchPayroll();
    } catch {
      toast.error('Thất bại', 'Lỗi khi mô phỏng thanh toán hàng loạt');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApproveExplanation = async () => {
    try {
      await leaveServices.approveExplanation(explanationApproveModal.id, {
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined
      });
      toast.success('Đã duyệt đơn giải trình');
      setExplanationApproveModal(null);
      fetchPendingExplanations();
    } catch {
      toast.error('Lỗi khi duyệt giải trình');
    }
  };

  const handleRejectExplanation = async (id: number) => {
    try {
      await leaveServices.rejectExplanation(id);
      toast.error('Đã từ chối đơn giải trình');
      fetchPendingExplanations();
    } catch {
      toast.error('Lỗi khi từ chối giải trình');
    }
  };

  const typeLabel = (type: string) => {
    const dict: Record<string, string> = {
      Annual: 'Nghỉ phép', Sick: 'Nghỉ phép', Personal: 'Nghỉ phép', Unpaid: 'Nghỉ phép',
      Late: 'Đi trễ', Missing_Punch: 'Quên chấm công', Leave_Early: 'Về sớm'
    };
    return dict[type] || type;
  };

  const pendingExplanationColumns: ColumnDef<any>[] = [
    { accessor: 'employee', label: 'Nhân viên', render: (item) => <span className="font-medium">{item.employee?.fullName}</span> },
    { accessor: 'type', label: 'Loại', render: (item) => <span className="font-medium">{typeLabel(item.type)}</span> },
    { accessor: 'date', label: 'Ngày', render: (item) => <span>{formatDate(item.date)}</span> },
    { accessor: 'reason', label: 'Lý do' },
    {
      accessor: 'actions', label: 'Thao tác',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-green-600 hover:bg-green-50" onClick={() => {
            setExplanationApproveModal(item);
            setCheckInTime('');
            setCheckOutTime('');
          }}>
            <Check className="w-4 h-4 mr-1" /> Duyệt
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleRejectExplanation(item.id)}>
            <X className="w-4 h-4 mr-1" /> Từ chối
          </Button>
        </div>
      )
    }
  ];

  const handleExportExcel = async () => {
    try {
      const [month, year] = selectedPeriod.split('/');
      const res = await api.get(`/payroll/export-excel?month=${month}&year=${year}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BangLuong_T${month}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Thành công', 'Đã tải xuống file Excel');
    } catch (error) {
      toast.error('Lỗi', 'Không thể xuất Excel');
    }
  };

  const submitExplanation = async () => {
    if (!explanationReason.trim()) return toast.error('Lỗi', 'Vui lòng nhập lý do');
    try {
      await api.post('/leaves/explanations', {
        date: explanationModal?.date,
        type: explanationType,
        reason: explanationReason
      });
      toast.success('Thành công', 'Đã gửi đơn kiến nghị');
      setExplanationModal(null);
      setExplanationReason('');
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể gửi giải trình');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h2 font-bold mb-1">Bảng lương</h1>
          <p className="text-text-sec">{isAdminOrHR ? 'Quản lý và duyệt bảng lương hàng tháng.' : 'Xem phiếu lương cá nhân của bạn.'}</p>
        </div>
        
        <div className="flex gap-2 bg-surface-alt p-1 rounded-lg border border-border">
          <button 
            onClick={() => setActiveTab('payroll')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'payroll' ? 'bg-surface shadow text-brand-600' : 'text-text-muted hover:text-text-primary'}`}
          >
            Bảng lương
          </button>
          <button 
            onClick={() => setActiveTab('advance')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'advance' ? 'bg-surface shadow text-brand-600' : 'text-text-muted hover:text-text-primary'}`}
          >
            Ứng lương
          </button>
          {isAdminOrHR && (
            <button 
              onClick={() => setActiveTab('explanations')} 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'explanations' ? 'bg-surface shadow text-brand-600' : 'text-text-muted hover:text-text-primary'}`}
            >
              Duyệt giải trình
            </button>
          )}
        </div>
      </div>

      {activeTab === 'advance' ? (
        <AdvanceRequest />
      ) : activeTab === 'explanations' ? (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Giải trình chấm công cần duyệt ({pendingExplanations.length})</CardTitle>
          </CardHeader>
          <div className="p-0">
            <Table columns={pendingExplanationColumns} data={pendingExplanations} emptyState="Không có đơn giải trình chờ duyệt." pagination pageSize={10} />
          </div>
        </Card>
      ) : (
        <>
          <div className="flex justify-end gap-2 items-center mb-4">
            <select 
              className="rounded-md border border-border bg-surface text-sm p-2 focus:ring-2 focus:ring-brand-500/30"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {monthOptions.map(period => (
                <option key={period} value={period}>Tháng {period}</option>
              ))}
            </select>
            {isAdminOrHR && (
              <>
                <Button variant="outline" size="sm" onClick={handleCalculatePayroll} disabled={calculating}>
                  {calculating ? 'Đang tính toán...' : 'Tính lương tự động'}
                </Button>
                <Button variant="primary" size="sm" onClick={handleApprovePayroll}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Duyệt & Gửi
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-green-500 text-green-600 hover:bg-green-50">
                  <Download className="w-4 h-4 mr-2" />
                  Xuất Excel
                </Button>
                {payrolls.some(p => p.status === 'Approved') && (
                  <Button size="sm" onClick={handleBulkSimulatePayment} disabled={isSimulating} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Giả lập Thanh toán
                  </Button>
                )}
              </>
            )}
          </div>

      {isAdminOrHR ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-brand-50 text-brand-600 rounded-md">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-text-muted">{s.label}</p>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <h3 className="text-2xl font-bold">{s.value}</h3>
                  <span className={`flex items-center text-xs font-semibold ${s.up ? 'text-green-500' : 'text-red-500'}`}>
                    {s.up ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                    {s.trend}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bảng lương chi tiết - Kỳ {selectedPeriod}</CardTitle>
            </CardHeader>
            <div className="p-0">
              {loading ? (
                <div className="p-8 text-center text-text-muted animate-pulse">Đang tải bảng lương...</div>
              ) : payrolls.length === 0 ? (
                <div className="p-8 text-center text-text-muted">Chưa có dữ liệu lương kỳ này. Bấm "Tính lương tự động" để tạo.</div>
              ) : (
                <Table columns={columns} data={payrolls} pagination pageSize={10} />
              )}
            </div>
            <CardFooter className="bg-surface-alt/50 border-t border-border flex justify-between items-center text-sm">
              <span className="text-text-muted">Đã hiển thị {payrolls.length} nhân viên</span>
            </CardFooter>
          </Card>
        </>
      ) : (
        /* Employee View */
        <div className="space-y-6 animate-fade-in">
          {loading ? (
            <div className="p-12 text-center text-text-muted animate-pulse bg-surface rounded-xl border border-border">Đang tải phiếu lương...</div>
          ) : payrolls.length === 0 ? (
            <div className="p-12 text-center text-text-muted bg-surface rounded-xl border border-border flex flex-col items-center">
              <DollarSign className="w-12 h-12 text-text-muted/30 mb-4" />
              Chưa có phiếu lương cho kỳ {selectedPeriod}.
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border bg-brand-50/50 dark:bg-brand-900/10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-brand-600">Phiếu lương tháng {selectedPeriod}</h2>
                  <p className="text-sm text-text-sec mt-1">Nhân viên: <span className="font-medium text-text-primary">{user?.fullName}</span></p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold ${payrolls[0].status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {payrolls[0].status === 'Paid' ? 'Đã thanh toán' : 'Chờ duyệt'}
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="p-4 bg-surface-alt rounded-xl border border-border">
                    <p className="text-sm text-text-muted mb-1">Lương cơ bản</p>
                    <p className="font-mono text-lg font-semibold">{formatCurrency(payrolls[0].baseSalary)}</p>
                  </div>
                  <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 dark:bg-brand-900/20 dark:border-brand-800">
                    <p className="text-sm text-brand-600 dark:text-brand-400 mb-1">Tổng giờ làm</p>
                    <p className="font-mono text-lg font-bold text-brand-700 dark:text-brand-300">{Number(payrolls[0].workedHours || 0).toFixed(2)} h</p>
                  </div>
                  <div className="p-4 bg-surface-alt rounded-xl border border-border">
                    <p className="text-sm text-text-muted mb-1">Phụ cấp</p>
                    <p className="font-mono text-lg font-semibold">{formatCurrency(payrolls[0].allowance)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100 dark:bg-green-900/20 dark:border-green-800">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Thực nhận</p>
                    <p className="font-mono text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(payrolls[0].netSalary)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <div className="p-5 rounded-xl border border-border bg-surface shadow-sm">
                     <h3 className="font-bold mb-4 text-text-primary border-b border-border pb-2">Chi tiết thu nhập</h3>
                     <div className="space-y-3">
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-text-sec">Lương cơ bản</span>
                         <span className="font-mono font-medium">{formatCurrency(payrolls[0].baseSalary)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-text-sec">Phụ cấp</span>
                         <span className="font-mono font-medium">{formatCurrency(payrolls[0].allowance)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-text-sec">Thưởng làm thêm (OT)</span>
                         <span className="font-mono font-medium text-green-600">{formatCurrency(payrolls[0].overtimePay)}</span>
                       </div>
                       <div className="pt-3 border-t border-dashed border-border flex justify-between items-center mt-4">
                         <span className="font-semibold">Tổng thu nhập (Gross)</span>
                         <span className="font-mono font-bold text-brand-600">
                           {formatCurrency(Number(payrolls[0].baseSalary) + Number(payrolls[0].allowance) + Number(payrolls[0].overtimePay))}
                         </span>
                       </div>
                     </div>
                   </div>

                   <div className="p-5 rounded-xl border border-border bg-surface shadow-sm">
                     <h3 className="font-bold mb-4 text-text-primary border-b border-border pb-2">Khấu trừ & Thuế</h3>
                     <div className="space-y-3 h-full flex flex-col">
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-text-sec">Khấu trừ (Đi trễ, vi phạm...)</span>
                         <span className="font-mono font-medium text-red-500">-{formatCurrency(payrolls[0].deductions)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-text-sec">Thuế thu nhập (5%)</span>
                         <span className="font-mono font-medium text-red-500">-{formatCurrency(payrolls[0].tax)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm mt-1">
                         <span className="text-text-sec">Ứng lương</span>
                         <span className="font-mono font-medium text-orange-500">-{formatCurrency(payrolls[0].advancePayment || 0)}</span>
                       </div>
                       <div className="pt-3 border-t border-dashed border-border flex justify-between items-center mt-auto">
                         <span className="font-semibold">Tổng khấu trừ & Ứng</span>
                         <span className="font-mono font-bold text-red-600">
                           -{formatCurrency(Number(payrolls[0].deductions) + Number(payrolls[0].tax) + Number(payrolls[0].advancePayment || 0))}
                         </span>
                       </div>
                     </div>
                   </div>
                </div>
                
                {advanceDetails.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-orange-500" />
                      Lịch sử ứng lương trong tháng
                    </h3>
                    <div className="overflow-x-auto border border-border rounded-lg shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-surface-alt text-text-muted border-b border-border">
                          <tr>
                            <th className="px-4 py-3 font-medium">Ngày yêu cầu</th>
                            <th className="px-4 py-3 font-medium">Lý do</th>
                            <th className="px-4 py-3 font-medium text-right">Số tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {advanceDetails.map((adv, idx) => (
                            <tr key={idx} className="hover:bg-surface-alt/50 transition-colors">
                              <td className="px-4 py-3 font-medium">{formatDate(adv.createdAt)}</td>
                              <td className="px-4 py-3">{adv.reason || '-'}</td>
                              <td className="px-4 py-3 text-right font-mono text-orange-500 font-bold">
                                {formatCurrency(adv.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-brand-600" />
                    Bảng kê điểm danh tháng {selectedPeriod}
                  </h3>
                  {loadingDetails ? (
                    <div className="text-center p-8 text-text-muted animate-pulse">Đang tải chi tiết...</div>
                  ) : attendanceDetails.length === 0 ? (
                    <div className="text-center p-8 text-text-muted border rounded-lg border-dashed">Không có dữ liệu điểm danh</div>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-lg shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-surface-alt text-text-muted border-b border-border">
                          <tr>
                            <th className="px-4 py-3 font-medium">Ngày</th>
                            <th className="px-4 py-3 font-medium">Giờ vào</th>
                            <th className="px-4 py-3 font-medium">Giờ ra</th>
                            <th className="px-4 py-3 font-medium text-right">Số giờ</th>
                            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {attendanceDetails.map((att, idx) => {
                            let hours = 0;
                            let inTime = formatTime(att.checkInTime);
                            let outTime = formatTime(att.checkOutTime);
                            
                            if (att.checkInTime && att.checkOutTime) {
                              const checkIn = new Date(att.checkInTime);
                              const checkOut = new Date(att.checkOutTime);
                              hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                              if (hours > 5) hours -= 1; // Nghỉ trưa
                            }

                            return (
                              <tr key={idx} className="hover:bg-surface-alt/50 transition-colors">
                                <td className="px-4 py-3 font-medium">{formatDate(att.date)}</td>
                                <td className="px-4 py-3 font-mono text-xs">{inTime}</td>
                                <td className="px-4 py-3 font-mono text-xs">{outTime}</td>
                                <td className="px-4 py-3 text-right font-mono text-brand-600 font-bold">
                                  {hours > 0 ? hours.toFixed(2) + ' h' : '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {(!att.checkInTime || !att.checkOutTime) && (
                                    <Button size="sm" variant="outline" onClick={() => setExplanationModal({ date: att.date })} className="text-xs py-1 h-auto text-brand-600 border-brand-200 hover:bg-brand-50">
                                      Kiến nghị
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {explanationModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-fade-in">
          <div className="bg-surface p-6 rounded-xl w-[400px] shadow-lg">
            <h2 className="text-xl font-bold mb-4">Kiến nghị giải trình</h2>
            <p className="mb-4 text-sm text-text-sec">Ngày: <span className="font-medium text-text-primary">{formatDate(explanationModal.date)}</span></p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Loại giải trình</label>
                <select className="w-full p-2 border border-border rounded-lg bg-surface-alt focus:ring-2 focus:ring-brand-500/30" value={explanationType} onChange={e => setExplanationType(e.target.value)}>
                  <option value="Missing_Punch">Quên chấm công (Missing Punch)</option>
                  <option value="Late">Đi trễ</option>
                  <option value="Leave_Early">Về sớm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lý do</label>
                <textarea className="w-full p-2 border border-border rounded-lg bg-surface-alt h-24 focus:ring-2 focus:ring-brand-500/30" value={explanationReason} onChange={e => setExplanationReason(e.target.value)} placeholder="Nhập lý do chi tiết..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExplanationModal(null)}>Hủy</Button>
              <Button variant="primary" onClick={submitExplanation}>Gửi duyệt</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Chi tiết phiếu lương Modal */}
      {detailsModalOpen && selectedEmployeePayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-alt">
              <h2 className="text-lg font-bold">Chi tiết phiếu lương - {selectedEmployeePayroll.employee?.fullName || user?.fullName}</h2>
              <button onClick={() => setDetailsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                &times;
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-surface-alt rounded-lg border border-border">
                  <p className="text-xs text-text-muted">Lương cơ bản</p>
                  <p className="font-mono font-medium">{formatCurrency(selectedEmployeePayroll.baseSalary)}</p>
                </div>
                <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
                  <p className="text-xs text-brand-600">Tổng giờ làm</p>
                  <p className="font-mono font-bold text-brand-700">{Number(selectedEmployeePayroll.overtimePay || 0).toFixed(2)} h</p>
                </div>
                <div className="p-3 bg-surface-alt rounded-lg border border-border">
                  <p className="text-xs text-text-muted">Phụ cấp</p>
                  <p className="font-mono font-medium">{formatCurrency(selectedEmployeePayroll.allowance)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs text-green-600">Thực nhận</p>
                  <p className="font-mono font-bold text-green-700">{formatCurrency(selectedEmployeePayroll.netSalary)}</p>
                </div>
              </div>
              
              {advanceDetails.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-500" />
                    Lịch sử ứng lương tháng {selectedPeriod}
                  </h3>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface-alt text-text-muted">
                        <tr>
                          <th className="px-4 py-3 border-b border-border">Ngày yêu cầu</th>
                          <th className="px-4 py-3 border-b border-border">Lý do</th>
                          <th className="px-4 py-3 border-b border-border text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advanceDetails.map((adv, idx) => (
                          <tr key={idx} className="border-b border-border/50 hover:bg-surface-alt/50">
                            <td className="px-4 py-2">{formatDate(adv.createdAt)}</td>
                            <td className="px-4 py-2">{adv.reason || '-'}</td>
                            <td className="px-4 py-2 text-right font-mono text-orange-500 font-medium">
                              {formatCurrency(adv.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-brand-600" />
                  Bảng kê điểm danh tháng {selectedPeriod}
                </h3>
                {loadingDetails ? (
                  <div className="text-center p-8 text-text-muted animate-pulse">Đang tải chi tiết...</div>
                ) : attendanceDetails.length === 0 ? (
                  <div className="text-center p-8 text-text-muted border rounded-lg border-dashed">Không có dữ liệu điểm danh</div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface-alt text-text-muted">
                        <tr>
                          <th className="px-4 py-3 border-b border-border">Ngày</th>
                          <th className="px-4 py-3 border-b border-border">Giờ vào</th>
                          <th className="px-4 py-3 border-b border-border">Giờ ra</th>
                          <th className="px-4 py-3 border-b border-border text-right">Số giờ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceDetails.map((att, idx) => {
                          let hours = 0;
                          let inTime = formatTime(att.checkInTime);
                          let outTime = formatTime(att.checkOutTime);
                          
                          if (att.checkInTime && att.checkOutTime) {
                            const checkIn = new Date(att.checkInTime);
                            const checkOut = new Date(att.checkOutTime);
                            hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                            if (hours > 5) hours -= 1; // Nghỉ trưa
                          }

                          return (
                            <tr key={idx} className="border-b border-border/50 hover:bg-surface-alt/50">
                              <td className="px-4 py-2">{formatDate(att.date)}</td>
                              <td className="px-4 py-2 font-mono text-xs">{inTime}</td>
                              <td className="px-4 py-2 font-mono text-xs">{outTime}</td>
                              <td className="px-4 py-2 text-right font-mono text-brand-600 font-medium">
                                {hours > 0 ? hours.toFixed(2) + ' h' : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Modal cho Lương */}
      {simulateRequest && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-fade-in p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
            {/* SePay Header */}
            <div className="bg-[#0052CC] p-4 flex justify-between items-center text-white">
              <div className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>Cổng Thanh Toán SePay</span>
              </div>
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Sandbox</div>
            </div>
            
            <div className="p-5 flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-1">Số tiền thanh toán</div>
              <div className="text-3xl font-extrabold text-[#0052CC] mb-4">{formatCurrency(simulateRequest.netSalary)}</div>
              
              {(() => {
                const bName = simulateRequest.employee?.salaryInfo?.bankName || simulateRequest.employee?.onboarding?.bankName;
                const bAcc = simulateRequest.employee?.salaryInfo?.bankAccount || simulateRequest.employee?.onboarding?.bankAccountNumber;
                
                if (!bName || !bAcc) {
                  return (
                    <div className="w-full bg-red-50 p-4 border border-red-200 rounded-lg text-center mb-4 text-red-600 text-sm">
                      Nhân viên chưa khai báo tài khoản ngân hàng. Vui lòng cập nhật hồ sơ!
                    </div>
                  );
                }

                return (
                  <>
                    <div className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Người nhận:</span>
                        <span className="font-semibold text-gray-800 text-sm">{simulateRequest.employee?.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Tài khoản:</span>
                        <span className="font-semibold text-gray-800 text-sm">{bAcc} - {bName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Nội dung:</span>
                        <span className="font-bold text-[#0052CC] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-sm">L{simulateRequest.id}</span>
                      </div>
                    </div>
                    
                    <div className="p-1 border-2 border-dashed border-blue-200 rounded-xl bg-white mb-6 hover:border-blue-400 transition-colors w-48 h-48 flex items-center justify-center">
                      <img 
                        src={`https://img.vietqr.io/image/${bName}-${bAcc}-compact2.png?amount=${simulateRequest.netSalary}&addInfo=L${simulateRequest.id}&accountName=${encodeURIComponent(simulateRequest.employee?.fullName || '')}`} 
                        alt="VietQR" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </>
                );
              })()}

              {/* Simulation Actions */}
              <div className="w-full space-y-2 mt-2">
                <div className="text-xs text-center text-gray-400 mb-3 font-semibold uppercase tracking-wider">Thao tác Mô phỏng</div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm" 
                  onClick={handleSimulatePayment} 
                  isLoading={isSimulating}
                >
                  <FileCheck className="w-4 h-4 mr-2" /> Thanh toán Thành công
                </Button>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm" 
                  onClick={() => {
                    toast.error('Lỗi giao dịch', 'Mô phỏng ngân hàng từ chối thanh toán.');
                    setSimulateRequest(null);
                  }}
                >
                  <span className="w-4 h-4 mr-2 text-xl font-bold flex items-center justify-center leading-none">&times;</span> Lỗi giao dịch
                </Button>
                <Button 
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                  variant="ghost" 
                  onClick={() => setSimulateRequest(null)}
                >
                  Hủy bỏ
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Advance Modal */}
      {editAdvanceModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-surface w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-brand-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-brand-700">Cập nhật Ứng lương</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-text-sec mb-2">Nhân viên: <strong>{editAdvanceModal.item.employee?.fullName}</strong></p>
              <label className="block text-sm font-medium text-text-primary mb-1">Số tiền (VNĐ):</label>
              <input 
                type="text" 
                value={editAdvanceModal.amount} 
                onChange={(e) => setEditAdvanceModal({ ...editAdvanceModal, amount: e.target.value })}
                className="w-full border border-border rounded p-2 focus:ring focus:ring-brand-500/30 text-lg font-mono"
              />
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface-alt">
              <Button variant="outline" onClick={() => setEditAdvanceModal(null)}>Hủy</Button>
              <Button variant="primary" onClick={submitUpdateAdvance}>Cập nhật</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      </> // close activeTab === 'payroll' wrapper
      )}

      {explanationApproveModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-fade-in">
          <div className="bg-surface p-6 rounded-xl w-[400px] shadow-lg">
            <h2 className="text-xl font-bold mb-4">Duyệt giải trình chấm công</h2>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-medium text-text-sec mb-1">Nhân viên</p>
                <p className="font-semibold">{explanationApproveModal.employee?.fullName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-text-sec mb-1">Loại</p>
                  <p className="font-semibold">{typeLabel(explanationApproveModal.type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-sec mb-1">Ngày</p>
                  <p className="font-semibold">{formatDate(explanationApproveModal.date)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-text-sec mb-1">Lý do</p>
                <p className="text-sm p-3 bg-surface-alt rounded-lg border border-border">{explanationApproveModal.reason}</p>
              </div>
              
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3">Điền giờ check-in / check-out (Tuỳ chọn)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-sec mb-1">Giờ vào</label>
                    <input type="datetime-local" className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-brand-500/30" value={checkInTime} onChange={(e: any) => setCheckInTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-text-sec mb-1">Giờ ra</label>
                    <input type="datetime-local" className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-brand-500/30" value={checkOutTime} onChange={(e: any) => setCheckOutTime(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExplanationApproveModal(null)}>Hủy</Button>
              <Button variant="primary" onClick={handleApproveExplanation}>Xác nhận Duyệt</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
