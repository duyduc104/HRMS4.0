import { useState, useEffect } from 'react';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Check, X, ShieldAlert } from 'lucide-react';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';

export function SecurityViolationTab() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);

  const fetchViolations = async () => {
    try {
      const res = await api.get('/web-filters/violations');
      setViolations(res.data || []);
    } catch (err) {
      toast.error('Lỗi', 'Không thể tải danh sách vi phạm bảo mật');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();

    const handleNewViolation = () => {
      fetchViolations();
    };
    window.addEventListener('new_violation_submitted', handleNewViolation);
    return () => window.removeEventListener('new_violation_submitted', handleNewViolation);
  }, []);

  const handleReview = async (id: number, status: 'Resolved' | 'Rejected', adminNote: string = '') => {
    try {
      await api.post('/web-filters/review-violation', { violationId: id, status, adminNote });
      toast.success('Thành công', `Đã ${status === 'Resolved' ? 'duyệt' : 'từ chối'} giải trình!`);
      fetchViolations();
      setSelectedViolation(null);
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể thao tác');
    }
  };

  const columns: ColumnDef<any>[] = [
    { 
      accessor: 'employee', 
      label: 'Nhân viên', 
      render: (item) => (
        <div>
          <p className="font-medium">{item.employee?.fullName}</p>
          <p className="text-xs text-text-sec">{item.employee?.email}</p>
        </div>
      )
    },
    { accessor: 'date', label: 'Ngày vi phạm', render: (item) => <span className="font-mono text-sm">{item.date}</span> },
    { 
      accessor: 'blockedCount', 
      label: 'Số URL bị chặn', 
      render: (item) => <span className="font-bold text-danger">{item.blockedCount} lần</span>
    },
    { 
      accessor: 'status', 
      label: 'Trạng thái', 
      render: (item) => {
        const colors: any = {
          Pending: 'warning',
          Submitted: 'info',
          Resolved: 'active',
          Rejected: 'danger'
        };
        const labels: any = {
          Pending: 'Chưa giải trình',
          Submitted: 'Chờ duyệt',
          Resolved: 'Đã duyệt',
          Rejected: 'Đã từ chối'
        };
        return <Badge variant={colors[item.status] || 'default'}>{labels[item.status]}</Badge>;
      } 
    },
    { 
      accessor: 'actions', 
      label: 'Thao tác', 
      render: (item) => (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSelectedViolation(item)}
        >
          Xem chi tiết
        </Button>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table columns={columns} data={violations} isLoading={loading} pagination pageSize={10} />
      </div>

      {selectedViolation && (
        <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-surface rounded-2xl shadow-xl border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-danger" />
                Chi tiết Vi phạm - {selectedViolation.employee?.fullName}
              </h3>
              <button onClick={() => setSelectedViolation(null)} className="text-text-sec hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-bg p-4 rounded-lg space-y-2">
                <p><span className="text-text-sec">Ngày vi phạm:</span> <span className="font-medium">{selectedViolation.date}</span></p>
                <p><span className="text-text-sec">Số lần chặn:</span> <span className="font-bold text-danger">{selectedViolation.blockedCount}</span></p>
                <div>
                  <span className="text-text-sec block mb-1">Các URL bị chặn:</span>
                  <div className="text-xs font-mono bg-danger/5 text-danger p-2 rounded max-h-32 overflow-y-auto break-all">
                    {selectedViolation.blockedUrls}
                  </div>
                </div>
              </div>

              {selectedViolation.status !== 'Pending' && (
                <div className="bg-brand-50 border border-brand-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-brand-700 mb-2">Nội dung giải trình:</h4>
                  <p className="italic text-text-primary">"{selectedViolation.explanation}"</p>
                </div>
              )}
              
              {selectedViolation.status === 'Pending' && (
                <p className="text-warning text-center italic py-4">Nhân viên chưa nộp giải trình.</p>
              )}

              {selectedViolation.status === 'Submitted' && (
                <div className="flex gap-4 pt-4 border-t border-border mt-4">
                  <Button 
                    variant="danger" 
                    className="flex-1"
                    onClick={() => {
                      const reason = window.prompt("Lý do từ chối (Nhân viên sẽ phải viết lại):");
                      if (reason !== null) handleReview(selectedViolation.id, 'Rejected', reason);
                    }}
                  >
                    Từ chối
                  </Button>
                  <Button 
                    variant="primary" 
                    className="flex-1 bg-active hover:bg-active/90"
                    onClick={() => handleReview(selectedViolation.id, 'Resolved')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Duyệt & Mở khóa
                  </Button>
                </div>
              )}
              
              {(selectedViolation.status === 'Resolved' || selectedViolation.status === 'Rejected') && (
                <div className="mt-4 text-center">
                  <Badge variant={selectedViolation.status === 'Resolved' ? 'active' : 'danger'} className="text-base px-4 py-1">
                    Đã xử lý: {selectedViolation.status === 'Resolved' ? 'Duyệt' : 'Từ chối'}
                  </Badge>
                  {selectedViolation.adminNote && (
                    <p className="mt-2 text-sm text-text-sec">Ghi chú: {selectedViolation.adminNote}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
