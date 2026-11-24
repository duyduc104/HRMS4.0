import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { formatCurrency, parseCurrency, formatNumberInput, formatDate } from '../../utils/format';

export function AdvanceRequest() {
  const { user, token } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [simulateRequest, setSimulateRequest] = useState<any>(null);
  const [filterDate, setFilterDate] = useState('');
  
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const userRole = (user?.role || '').toLowerCase().replace(/\s+/g, '_');
  const userRoles = (user?.roles || []).map((r: any) => 
    (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
  );
  const allRoles = [...new Set([userRole, ...userRoles])];
  const isAdminOrHR = allRoles.some(r => ['admin', 'hr_manager', 'accountant'].includes(r));

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get(isAdminOrHR ? '/advance-requests' : '/advance-requests/me');
      setRequests(res.data);
    } catch (e) {
      toast.error('Lỗi', 'Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!token) return;
    const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    const socket = io(backendUrl, { auth: { token } });
    socket.on('advance_payment_success', (data: any) => {
      toast.success('Giải ngân thành công', data.message);
      fetchRequests();
    });
    return () => { socket.disconnect(); };
  }, [token]);

  const handleSimulateSepay = async () => {
    if (!simulateRequest) return;
    try {
      await api.post('/sepay/webhook', {
        isSimulation: true,
        transferType: 'out',
        transferAmount: simulateRequest.amount,
        content: `TU${simulateRequest.id}`
      });
      toast.success('Thành công', 'Đã mô phỏng chuyển khoản thành công. Đơn đã chuyển sang trạng thái Đã giải ngân.');
      setSimulateModalOpen(false);
      fetchRequests();
    } catch (e) {
      toast.error('Lỗi', 'Không thể mô phỏng chuyển khoản');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/advance-requests/${id}/status`, { status });
      toast.success('Thành công', `Đã ${status === 'Approved' ? 'duyệt' : 'từ chối'} yêu cầu`);
      fetchRequests();
    } catch (e) {
      toast.error('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const numAmount = parseCurrency(amount);
      if (numAmount <= 0) {
        return toast.error('Lỗi', 'Số tiền không hợp lệ');
      }
      await api.post('/advance-requests', {
        amount: numAmount,
        reason,
        periodMonth: currentMonth,
        periodYear: currentYear
      });
      toast.success('Thành công', 'Đã gửi yêu cầu ứng lương');
      setModalOpen(false);
      setAmount('');
      setReason('');
      fetchRequests();
    } catch (e) {
      toast.error('Lỗi', 'Không thể tạo yêu cầu');
    }
  };

  const columns: ColumnDef<any>[] = [
    ...(isAdminOrHR ? [{ accessor: 'employee', label: 'Nhân viên', render: (item: any) => <span className="font-medium">{item.employee?.fullName}</span> }] : []),
    { accessor: 'period', label: 'Kỳ lương', render: (item: any) => <span>Tháng {item.periodMonth}/{item.periodYear}</span> },
    { accessor: 'amount', label: 'Số tiền', render: (item: any) => <span className="font-mono font-bold text-orange-500">{formatCurrency(item.amount)}</span> },
    { accessor: 'reason', label: 'Lý do' },
    { accessor: 'status', label: 'Trạng thái', render: (item: any) => {
        let badgeClass = 'bg-yellow-100 text-yellow-700';
        let label = 'Chờ duyệt';
        if (item.status === 'Approved') { 
          if (item.isPaid) {
            badgeClass = 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm';
            label = 'Đã giải ngân';
          } else {
            badgeClass = 'bg-green-100 text-green-700'; 
            label = 'Đã duyệt'; 
          }
        }
        else if (item.status === 'Rejected') { badgeClass = 'bg-red-100 text-red-700'; label = 'Từ chối'; }
        return <span className={`px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap inline-block ${badgeClass}`}>{label}</span>;
      }
    },
    { accessor: 'createdAt', label: 'Ngày tạo', render: (item: any) => <span>{formatDate(item.createdAt)}</span> },
    ...(isAdminOrHR ? [{
      accessor: 'actions',
      label: 'Thao tác',
      render: (item: any) => {
        if (item.status === 'Pending') {
          return (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(item.id, 'Rejected')}>Từ chối</Button>
              <Button variant="primary" size="sm" onClick={() => handleUpdateStatus(item.id, 'Approved')}>Duyệt</Button>
            </div>
          );
        } else if (item.status === 'Approved' && !item.isPaid) {
          return (
            <div className="flex gap-2 justify-end flex-nowrap">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100 whitespace-nowrap flex-shrink-0"
                onClick={() => { setSimulateRequest(item); setSimulateModalOpen(true); }}
              >
                Mô phỏng giải ngân
              </Button>
            </div>
          );
        }
        return null;
      }
    }] : [])
  ];

  const filteredRequests = filterDate 
    ? requests.filter(r => new Date(r.createdAt).toISOString().split('T')[0] === filterDate)
    : requests;

  return (

    
    <div className="space-y-4 animate-fade-in mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-bold">Danh sách yêu cầu ứng lương</h2>
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-md border border-border bg-surface text-sm p-2 focus:ring-2 focus:ring-brand-500/30"
            title="Lọc theo ngày tạo"
          />
          {filterDate && (
            <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>Xóa lọc</Button>
          )}
          {!isAdminOrHR && (
            <Button variant="primary" onClick={() => setModalOpen(true)}>+ Tạo yêu cầu</Button>
          )}
        </div>
      </div>

      <Card>
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-text-muted animate-pulse">Đang tải dữ liệu...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-text-muted">Chưa có yêu cầu ứng lương nào.</div>
          ) : (
            <Table columns={columns} data={filteredRequests} pagination pageSize={10} />
          )}
        </div>
      </Card>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-alt">
              <h2 className="text-lg font-bold">Yêu cầu ứng lương</h2>
              <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-primary">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kỳ lương</label>
                <input type="text" disabled value={`Tháng ${currentMonth}/${currentYear}`} className="w-full rounded-md border border-border bg-surface-alt p-2 text-sm text-text-muted" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formatNumberInput(amount)} 
                  onChange={e => setAmount(parseCurrency(e.target.value).toString())}
                  className="w-full rounded-md border border-border p-2 text-sm focus:ring-2 focus:ring-brand-500/30"
                  placeholder="Ví dụ: 2,000,000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lý do</label>
                <textarea 
                  value={reason} 
                  onChange={e => setReason(e.target.value)}
                  className="w-full rounded-md border border-border p-2 text-sm focus:ring-2 focus:ring-brand-500/30 min-h-[80px]"
                  placeholder="Lý do ứng lương..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
                <Button variant="primary" type="submit">Gửi yêu cầu</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {simulateModalOpen && simulateRequest && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-fade-in p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
            {/* SePay Header */}
            <div className="bg-[#0052CC] p-4 flex justify-between items-center text-white">
              <div className="font-bold text-lg flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center border-2 border-white rounded-full font-bold text-xs">$</span>
                <span>Cổng Thanh Toán SePay</span>
              </div>
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Sandbox</div>
            </div>
            
            <div className="p-5 flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-1">Số tiền thanh toán</div>
              <div className="text-3xl font-extrabold text-[#0052CC] mb-4">{formatCurrency(simulateRequest.amount)}</div>
              
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
                        <span className="font-bold text-[#0052CC] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-sm">TU{simulateRequest.id}</span>
                      </div>
                    </div>
                    
                    <div className="p-1 border-2 border-dashed border-blue-200 rounded-xl bg-white mb-6 hover:border-blue-400 transition-colors w-48 h-48 flex items-center justify-center">
                      <img 
                        src={`https://img.vietqr.io/image/${bName}-${bAcc}-compact2.png?amount=${simulateRequest.amount}&addInfo=TU${simulateRequest.id}&accountName=${encodeURIComponent(simulateRequest.employee?.fullName || '')}`} 
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
                  onClick={handleSimulateSepay} 
                >
                  <Check className="w-4 h-4 mr-2" /> Thanh toán Thành công
                </Button>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm" 
                  onClick={() => {
                    import('../../stores/useToastStore').then(({ toast }) => toast.error('Lỗi giao dịch', 'Mô phỏng ngân hàng từ chối thanh toán.'));
                    setSimulateModalOpen(false);
                  }}
                >
                  <X className="w-4 h-4 mr-2" /> Lỗi giao dịch
                </Button>
                <Button 
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                  variant="ghost" 
                  onClick={() => setSimulateModalOpen(false)}
                >
                  Hủy bỏ
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
