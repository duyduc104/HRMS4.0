import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, FileText, Check, X, Clock, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { Input } from '../../components/ui/Input/Input';
import { toast } from '../../stores/useToastStore';
import { leaveServices } from '../../services/leave';
import { useAuthStore } from '../../stores/useAuthStore';

export function Leave() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const activeTabFromUrl = searchParams.get('tab');

  const [isRequestingLeave, setIsRequestingLeave] = useState(false);
  const [isRequestingExplanation, setIsRequestingExplanation] = useState(false);

  const { user } = useAuthStore();
  const userRole = (user?.role || '').toLowerCase();
  const userRoles = (user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r.name || '').toLowerCase());
  const allUserRoles = [...new Set([userRole, ...userRoles])];
  const isAdmin = allUserRoles.includes('admin');
  const isHR = allUserRoles.includes('hr_manager');
  const isDeptManager = allUserRoles.includes('department_manager');
  const isAdminOrHR = isAdmin || isHR || isDeptManager;

  // API states
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [myExplanations, setMyExplanations] = useState<any[]>([]);
  const [pendingExplanations, setPendingExplanations] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Forms
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'Annual', startDate: '', endDate: '', reason: '' });
  const [explanationForm, setExplanationForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'Late', reason: '' });

  // Dynamic balance calculation based on myLeaves
  const getUsedDays = (type: string) => {
    return myLeaves
      .filter((l: any) => l.leaveType === type && (l.status === 'Approved' || l.status === 'Pending' || l.status === 'Pending_HR' || l.status === 'Pending_Admin'))
      .reduce((total, l) => {
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
  };

  const totalUsed = getUsedDays('Annual') + getUsedDays('Sick') + getUsedDays('Personal') + getUsedDays('Unpaid');

  const leaveBalances = [
    { type: 'Tổng ngày nghỉ phép (Năm)', total: 12, used: totalUsed, left: 12 - totalUsed, color: 'bg-brand-50 text-brand-600' }
  ];

  const fetchMyData = useCallback(async () => {
    try {
      const [leaves, explanations] = await Promise.all([
        leaveServices.getMyLeaves(),
        leaveServices.getMyExplanations()
      ]);
      setMyLeaves(leaves || []);
      setMyExplanations(explanations || []);
    } catch (err) {
      console.error('Error fetching personal leave data:', err);
    }
  }, []);

  const fetchPendingData = useCallback(async () => {
    if (!isAdminOrHR) return;
    try {
      const [pLeaves, pExplanations] = await Promise.all([
        leaveServices.getPendingLeaves(),
        leaveServices.getPendingExplanations()
      ]);
      setPendingLeaves(pLeaves || []);
      setPendingExplanations(pExplanations || []);
    } catch (err) {
      console.error('Error fetching pending approval data:', err);
    }
  }, [isAdminOrHR]);

  useEffect(() => {
    fetchMyData();
    if (isAdminOrHR) fetchPendingData();

    const handleUpdate = () => {
      fetchMyData();
      if (isAdminOrHR) fetchPendingData();
    };

    window.addEventListener('hrms_leave_updated', handleUpdate);
    return () => {
      window.removeEventListener('hrms_leave_updated', handleUpdate);
    };
  }, [isAdminOrHR, fetchMyData, fetchPendingData]);

  useEffect(() => {
    if (location.state?.voiceData) {
      const data = location.state.voiceData;
      if (data.intent === 'leave_request') {
        setIsRequestingLeave(true);
        const formatForInput = (isoString: string) => {
          if (!isoString) return '';
          return isoString.slice(0, 16);
        };
        setLeaveForm({
          leaveType: data.leaveType || 'Annual',
          startDate: formatForInput(data.startDate),
          endDate: formatForInput(data.endDate),
          reason: data.reason || ''
        });
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state]);

  const handleCreateLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return toast.error('Vui lòng điền đầy đủ thông tin');
    }
    setIsLoading(true);
    try {
      await leaveServices.createLeave(leaveForm);
      toast.success('Gửi đơn xin nghỉ thành công, đang chờ các cấp duyệt');
      setIsRequestingLeave(false);
      setLeaveForm({ leaveType: 'Annual', startDate: '', endDate: '', reason: '' });
      fetchMyData();
      if (isAdminOrHR) fetchPendingData();
    } catch {
      toast.error('Gửi đơn thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExplanation = async () => {
    if (!explanationForm.date || !explanationForm.reason) {
      return toast.error('Vui lòng điền đầy đủ ngày và lý do giải trình');
    }
    setIsLoading(true);
    try {
      await leaveServices.createExplanation(explanationForm);
      toast.success('Gửi giải trình thành công, đang chờ các cấp duyệt');
      setIsRequestingExplanation(false);
      setExplanationForm({ date: new Date().toISOString().split('T')[0], type: 'Late', reason: '' });
      fetchMyData();
      if (isAdminOrHR) fetchPendingData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gửi giải trình thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveLeave = async (id: number) => {
    try {
      const res = await leaveServices.approveLeave(id);
      toast.success(res?.message || 'Đã duyệt đơn nghỉ phép');
      fetchPendingData();
      fetchMyData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt đơn');
    }
  };

  const handleRejectLeave = async (id: number) => {
    const reason = window.prompt('Nhập lý do từ chối đơn nghỉ phép (tùy chọn):');
    if (reason === null) return;
    try {
      await leaveServices.rejectLeave(id);
      toast.error('Đã từ chối đơn nghỉ phép');
      fetchPendingData();
      fetchMyData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối đơn');
    }
  };

  const handleApproveExplanation = async (id: number) => {
    try {
      const res = await leaveServices.approveExplanation(id);
      toast.success(res?.message || 'Đã duyệt giải trình chấm công');
      fetchPendingData();
      fetchMyData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt giải trình');
    }
  };

  const handleRejectExplanation = async (id: number) => {
    const reason = window.prompt('Nhập lý do từ chối giải trình (tùy chọn):');
    if (reason === null) return;
    try {
      await leaveServices.rejectExplanation(id);
      toast.error('Đã từ chối giải trình');
      fetchPendingData();
      fetchMyData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối giải trình');
    }
  };

  const handleCancelLeave = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn xin nghỉ phép này?')) return;
    try {
      await leaveServices.cancelLeave(id);
      toast.success('Thành công', 'Đã hủy đơn xin nghỉ phép');
      fetchMyData();
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể hủy đơn nghỉ phép');
    }
  };

  // Badge trạng thái theo từng cấp duyệt
  const statusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="warning">Chờ Trưởng phòng</Badge>;
      case 'Pending_HR':
        return <Badge variant="info">Chờ Nhân sự (Cấp 2)</Badge>;
      case 'Pending_Admin':
        return <Badge variant="pending">Chờ Giám đốc (Cấp 3)</Badge>;
      case 'Approved':
        return <Badge variant="active">Đã duyệt hoàn tất</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Bị từ chối</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const renderApprovalProgress = (item: any) => {
    return (
      <div className="text-xs space-y-0.5">
        <div className="flex items-center gap-1">
          <span className="text-text-muted">Cấp TP:</span>
          {item.managerApprover ? (
            <span className="text-green-600 font-medium">✓ {item.managerApprover.fullName}</span>
          ) : item.status === 'Pending' ? (
            <span className="text-amber-500">Đang chờ</span>
          ) : (
            <span className="text-text-muted">-</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-muted">Cấp HR:</span>
          {item.hrApprover ? (
            <span className="text-green-600 font-medium">✓ {item.hrApprover.fullName}</span>
          ) : item.status === 'Pending_HR' ? (
            <span className="text-blue-500">Đang chờ</span>
          ) : (
            <span className="text-text-muted">-</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-muted">Cấp GĐ:</span>
          {item.status === 'Approved' ? (
            <span className="text-green-600 font-medium">✓ {item.approver?.fullName || 'Giám đốc'}</span>
          ) : item.status === 'Pending_Admin' ? (
            <span className="text-purple-500">Đang chờ</span>
          ) : (
            <span className="text-text-muted">-</span>
          )}
        </div>
      </div>
    );
  };

  const getApprovalButtonText = (status: string) => {
    if (isAdmin) return 'Phê duyệt cuối (GĐ)';
    if (isHR) return 'Duyệt (Nhân sự)';
    if (isDeptManager) return 'Duyệt (Trưởng phòng)';
    return 'Duyệt';
  };

  const typeLabel = (type: string) => {
    const dict: Record<string, string> = {
      Annual: 'Nghỉ phép năm', Sick: 'Nghỉ ốm', Personal: 'Việc riêng', Unpaid: 'Nghỉ không lương',
      Late: 'Đi muộn', Missing_Punch: 'Quên chấm công', Leave_Early: 'Về sớm'
    };
    return dict[type] || type;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const myLeaveColumns: ColumnDef<any>[] = [
    { accessor: 'leaveType', label: 'Loại nghỉ', render: (item) => <span className="font-medium">{typeLabel(item.leaveType)}</span> },
    { accessor: 'dates', label: 'Thời gian', render: (item) => <span className="text-[13px]">{formatDateTime(item.startDate)}<br/>đến {formatDateTime(item.endDate)}</span> },
    { accessor: 'reason', label: 'Lý do' },
    { accessor: 'progress', label: 'Tiến trình duyệt', render: (item) => renderApprovalProgress(item) },
    { accessor: 'status', label: 'Trạng thái', render: (item) => statusBadge(item.status) },
    {
      accessor: 'action',
      label: 'Thao tác',
      render: (item) => (
        (item.status === 'Pending' || item.status === 'Pending_HR') ? (
          <Button 
            size="xs" 
            variant="ghost" 
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleCancelLeave(item.id)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Hủy
          </Button>
        ) : null
      )
    }
  ];

  const pendingLeaveColumns: ColumnDef<any>[] = [
    { 
      accessor: 'employee', 
      label: 'Nhân viên', 
      render: (item) => (
        <div>
          <span className="font-semibold block">{item.employee?.fullName}</span>
          <span className="text-xs text-text-muted">{item.employee?.department || 'Chưa phân phòng'} ({item.employee?.code})</span>
        </div>
      )
    },
    { accessor: 'leaveType', label: 'Loại nghỉ', render: (item) => <span className="font-medium">{typeLabel(item.leaveType)}</span> },
    { accessor: 'dates', label: 'Thời gian', render: (item) => <span className="text-[13px]">{formatDateTime(item.startDate)}<br/>đến {formatDateTime(item.endDate)}</span> },
    { accessor: 'reason', label: 'Lý do' },
    { accessor: 'status', label: 'Cấp hiện tại', render: (item) => statusBadge(item.status) },
    {
      accessor: 'actions', 
      label: 'Thao tác duyệt',
      render: (item) => (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 hover:bg-green-50" 
            onClick={() => handleApproveLeave(item.id)}
          >
            <Check className="w-4 h-4 mr-1" /> {getApprovalButtonText(item.status)}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:bg-red-50" 
            onClick={() => handleRejectLeave(item.id)}
          >
            <X className="w-4 h-4 mr-1" /> Từ chối
          </Button>
        </div>
      )
    }
  ];

  const myExplanationColumns: ColumnDef<any>[] = [
    { accessor: 'date', label: 'Ngày vi phạm', render: (item) => <span className="font-medium">{new Date(item.date).toLocaleDateString('vi-VN')}</span> },
    { accessor: 'type', label: 'Loại vi phạm', render: (item) => <span className="font-medium">{typeLabel(item.type)}</span> },
    { accessor: 'reason', label: 'Lý do giải trình' },
    { accessor: 'progress', label: 'Tiến trình duyệt', render: (item) => renderApprovalProgress(item) },
    { accessor: 'status', label: 'Trạng thái', render: (item) => statusBadge(item.status) }
  ];

  const pendingExplanationColumns: ColumnDef<any>[] = [
    { 
      accessor: 'employee', 
      label: 'Nhân viên', 
      render: (item) => (
        <div>
          <span className="font-semibold block">{item.employee?.fullName}</span>
          <span className="text-xs text-text-muted">{item.employee?.department || 'Chưa phân phòng'} ({item.employee?.code})</span>
        </div>
      )
    },
    { accessor: 'date', label: 'Ngày vi phạm', render: (item) => <span className="font-medium">{new Date(item.date).toLocaleDateString('vi-VN')}</span> },
    { accessor: 'type', label: 'Loại vi phạm', render: (item) => <span className="font-medium">{typeLabel(item.type)}</span> },
    { accessor: 'reason', label: 'Lý do giải trình' },
    { accessor: 'status', label: 'Cấp hiện tại', render: (item) => statusBadge(item.status) },
    {
      accessor: 'actions', 
      label: 'Thao tác duyệt',
      render: (item) => (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 hover:bg-green-50" 
            onClick={() => handleApproveExplanation(item.id)}
          >
            <Check className="w-4 h-4 mr-1" /> {getApprovalButtonText(item.status)}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:bg-red-50" 
            onClick={() => handleRejectExplanation(item.id)}
          >
            <X className="w-4 h-4 mr-1" /> Từ chối
          </Button>
        </div>
      )
    }
  ];

  const requestLeaveForm = (
    <Card className="max-w-2xl animate-slide-up">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsRequestingLeave(false)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>Tạo đơn xin nghỉ</CardTitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Loại nghỉ</label>
            <select 
              className="w-full rounded-md border border-border bg-surface text-sm p-2 focus:ring-2 focus:ring-brand-500/30"
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({...leaveForm, leaveType: e.target.value})}
            >
              <option value="Annual">Nghỉ phép năm</option>
              <option value="Sick">Nghỉ ốm</option>
              <option value="Personal">Việc riêng</option>
              <option value="Unpaid">Nghỉ không lương</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Từ lúc</label>
            <Input type="datetime-local" value={leaveForm.startDate} onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Đến lúc</label>
            <Input type="datetime-local" value={leaveForm.endDate} onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Lý do nghỉ</label>
          <textarea 
            className="w-full rounded-md border border-border bg-surface text-sm p-3 min-h-[100px] focus:ring-2 focus:ring-brand-500/30"
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
            placeholder="Ghi rõ lý do xin nghỉ..."
          ></textarea>
        </div>
      </CardBody>
      <CardFooter>
        <Button variant="ghost" onClick={() => setIsRequestingLeave(false)}>Hủy</Button>
        <Button variant="primary" onClick={handleCreateLeave} isLoading={isLoading}>Gửi đơn (Qua các cấp duyệt)</Button>
      </CardFooter>
    </Card>
  );

  const requestExplanationForm = (
    <Card className="max-w-2xl animate-slide-up">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsRequestingExplanation(false)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>Gửi giải trình chấm công mới</CardTitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ngày chấm công cần giải trình</label>
            <Input 
              type="date" 
              value={explanationForm.date} 
              onChange={(e) => setExplanationForm({...explanationForm, date: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Loại vi phạm</label>
            <select 
              className="w-full rounded-md border border-border bg-surface text-sm p-2 focus:ring-2 focus:ring-brand-500/30"
              value={explanationForm.type}
              onChange={(e) => setExplanationForm({...explanationForm, type: e.target.value})}
            >
              <option value="Late">Đi muộn</option>
              <option value="Missing_Punch">Quên chấm công (Check-in/Check-out)</option>
              <option value="Leave_Early">Về sớm</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Lý do giải trình chi tiết</label>
          <textarea 
            className="w-full rounded-md border border-border bg-surface text-sm p-3 min-h-[100px] focus:ring-2 focus:ring-brand-500/30"
            value={explanationForm.reason}
            onChange={(e) => setExplanationForm({...explanationForm, reason: e.target.value})}
            placeholder="Nêu rõ lý do đi muộn, quên quẹt thẻ hoặc về sớm..."
          ></textarea>
        </div>
      </CardBody>
      <CardFooter>
        <Button variant="ghost" onClick={() => setIsRequestingExplanation(false)}>Hủy</Button>
        <Button variant="primary" onClick={handleCreateExplanation} isLoading={isLoading}>Gửi giải trình</Button>
      </CardFooter>
    </Card>
  );

  const tabs: any[] = [
    {
      id: 'my-leave',
      label: 'Đơn nghỉ của tôi',
      content: (
        <div className="space-y-6 animate-fade-in">
          {isRequestingLeave ? requestLeaveForm : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Quỹ ngày nghỉ (Năm {new Date().getFullYear()})</h3>
                <Button variant="primary" onClick={() => setIsRequestingLeave(true)}>
                  <FileText className="w-4 h-4 mr-2" /> Tạo đơn nghỉ
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {leaveBalances.map((b, i) => (
                  <Card key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${b.color}`}>
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{b.type}</p>
                        <p className="text-xs text-text-muted">Tổng: {b.total} ngày</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-brand-600">{b.left}</p>
                      <p className="text-xs text-text-muted">còn lại</p>
                    </div>
                  </Card>
                ))}
              </div>
              
              <h3 className="font-semibold mt-8 mb-4">Lịch sử xin nghỉ (Quy trình duyệt 3 cấp)</h3>
              <Card>
                <div className="p-0">
                  <Table columns={myLeaveColumns} data={myLeaves} emptyState="Bạn chưa có đơn xin nghỉ nào." pagination pageSize={5} />
                </div>
              </Card>
            </>
          )}
        </div>
      )
    },
    {
      id: 'my-explanation',
      label: 'Giải trình của tôi',
      content: (
        <div className="space-y-6 animate-fade-in">
          {isRequestingExplanation ? requestExplanationForm : (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-base">Lịch sử giải trình vi phạm chấm công</h3>
                  <p className="text-xs text-text-muted">Quy trình duyệt: Trưởng phòng → Nhân sự → Ban Giám Đốc</p>
                </div>
                <Button variant="primary" onClick={() => setIsRequestingExplanation(true)}>
                  <Clock className="w-4 h-4 mr-2" /> Tạo giải trình mới
                </Button>
              </div>
              <Card>
                <div className="p-0">
                  <Table 
                    columns={myExplanationColumns} 
                    data={myExplanations} 
                    emptyState="Bạn chưa có đơn giải trình nào." 
                    pagination 
                    pageSize={5} 
                  />
                </div>
              </Card>
            </>
          )}
        </div>
      )
    }
  ];

  if (isAdminOrHR) {
    tabs.push({
      id: 'approval',
      label: `Duyệt Đơn Nghỉ (${pendingLeaves.length})`,
      content: (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle>Danh sách đơn nghỉ chờ duyệt</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  {isAdmin && '👑 Bạn là Quản trị viên / Ban Giám Đốc: có quyền duyệt hoàn tất ở mọi cấp.'}
                  {isHR && !isAdmin && '📋 Bạn là HR Manager: duyệt các đơn đã qua Trưởng phòng.'}
                  {isDeptManager && !isAdmin && !isHR && '🏢 Bạn là Trưởng phòng: duyệt các đơn của nhân viên thuộc phòng ban mình.'}
                </p>
              </div>
            </CardHeader>
            <div className="p-0">
              <Table 
                columns={pendingLeaveColumns} 
                data={pendingLeaves} 
                emptyState="Không có đơn xin nghỉ nào đang chờ bạn duyệt." 
                pagination 
                pageSize={10} 
              />
            </div>
          </Card>
        </div>
      )
    });

    tabs.push({
      id: 'explanation-approval',
      label: `Duyệt Giải Trình (${pendingExplanations.length})`,
      content: (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle>Danh sách giải trình chấm công chờ duyệt</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Phê duyệt theo cấp bậc Role để cập nhật lại chấm công hợp lệ.
                </p>
              </div>
            </CardHeader>
            <div className="p-0">
              <Table 
                columns={pendingExplanationColumns} 
                data={pendingExplanations} 
                emptyState="Không có đơn giải trình nào đang chờ bạn duyệt." 
                pagination 
                pageSize={10} 
              />
            </div>
          </Card>
        </div>
      )
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-bold mb-1">Nghỉ phép & Giải trình chấm công</h1>
        <p className="text-text-sec">Hệ thống quản lý đơn từ và phê duyệt đa cấp theo Role (Trưởng phòng → Nhân sự → Giám đốc).</p>
      </div>
      <Tabs tabs={tabs} defaultTab={activeTabFromUrl || 'my-leave'} />
    </div>
  );
}
