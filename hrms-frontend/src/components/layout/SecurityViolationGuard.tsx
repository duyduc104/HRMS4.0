import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from '../../stores/useToastStore';
import { ShieldAlert, Send } from 'lucide-react';
import { Button } from '../ui/Button/Button';
import api from '../../services/api';

export function SecurityViolationGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [violation, setViolation] = useState<any>(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkViolation = async () => {
      try {
        const res = await api.get('/web-filters/pending-violation');
        if (res.data?.violation) {
          setViolation(res.data.violation);
        }
      } catch (err) {
        console.error('Failed to check pending violation', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkViolation();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const handleViolationReviewed = (event: any) => {
      const { status, adminNote } = event.detail;
      if (status === 'Resolved') {
        toast.success('Giải trình đã được duyệt!', 'Bạn có thể tiếp tục làm việc.');
        setViolation(null); // Unlock
      } else if (status === 'Rejected') {
        toast.error('Giải trình bị TỪ CHỐI!', `Lý do: ${adminNote || 'Không hợp lệ'}. Vui lòng nộp lại.`);
        setViolation((prev: any) => ({ ...prev, status: 'Pending', explanation: '' }));
      }
    };

    window.addEventListener('violation_reviewed', handleViolationReviewed);
    return () => window.removeEventListener('violation_reviewed', handleViolationReviewed);
  }, [user]);

  const handleSubmit = async () => {
    if (!explanation.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập nội dung giải trình!');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await api.post('/web-filters/submit-violation', {
        violationId: violation.id,
        explanation
      });
      
      toast.success('Thành công', 'Đã nộp giải trình. Vui lòng chờ Admin duyệt!');
      setViolation({ ...violation, status: 'Submitted', explanation });
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể nộp giải trình');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (violation) {
    return (
      <div className="fixed inset-0 z-[9999] bg-bg flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-surface rounded-2xl shadow-xl overflow-hidden border border-border">
          <div className="bg-danger/10 p-6 flex items-center gap-4 border-b border-border">
            <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center text-danger">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-h3 font-bold text-danger">ĐÌNH CHỈ TRUY CẬP (VI PHẠM BẢO MẬT)</h2>
              <p className="text-text-sec text-sm mt-1">
                Tài khoản của bạn đã bị khóa do cố tình truy cập các trang web độc hại bị cấm.
              </p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-bg p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-text-sec text-sm">Ngày vi phạm:</span>
                <span className="font-medium">{violation.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-sec text-sm">Số lượng URL bị chặn:</span>
                <span className="font-bold text-danger">{violation.blockedCount} lần</span>
              </div>
              <div className="pt-2">
                <span className="text-text-sec text-sm block mb-1">Các URL vi phạm:</span>
                <div className="text-xs font-mono text-danger bg-danger/5 p-2 rounded max-h-32 overflow-y-auto break-all">
                  {violation.blockedUrls}
                </div>
              </div>
            </div>

            {violation.status === 'Pending' ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">
                  Yêu cầu Giải trình lý do cố tình truy cập: <span className="text-danger">*</span>
                </label>
                <textarea
                  className="w-full bg-bg border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none min-h-[120px]"
                  placeholder="Tôi đã truy cập vào các trang này vì..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
                <Button 
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Đang gửi...' : 'Nộp giải trình cho Quản trị viên'}
                  {!submitting && <Send className="w-5 h-5 ml-2" />}
                </Button>
              </div>
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-border rounded-xl">
                <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center text-warning mx-auto mb-4">
                  <div className="w-8 h-8 border-4 border-warning border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-bold mb-2">Đang chờ Admin duyệt</h3>
                <p className="text-text-sec">
                  Giải trình của bạn đã được gửi. Bạn không thể sử dụng hệ thống cho đến khi được Admin xem xét và chấp nhận.
                </p>
                <div className="mt-4 p-4 bg-bg rounded-lg text-left text-sm">
                  <span className="text-text-sec font-medium">Nội dung đã nộp:</span>
                  <p className="mt-1 italic">"{violation.explanation}"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
