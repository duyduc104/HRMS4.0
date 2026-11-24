import { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { Mail, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../stores/useToastStore';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../stores/useAuthStore';

interface AttendanceCalendarProps {
  year: number;
  month: number;
  records: any[];
}

export function AttendanceCalendar({ year, month, records }: AttendanceCalendarProps) {
  const [localRecords, setLocalRecords] = useState<any[]>([]);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token, user } = useAuthStore();
  const userRole = (user?.role || '').toLowerCase().replace(/\s+/g, '_');
  const userRoles = (user?.roles || []).map((r: any) => 
    (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
  );
  const allRoles = [...new Set([userRole, ...userRoles])];
  const isManager = allRoles.some(r => ['admin', 'hr_manager', 'department_manager'].includes(r));
  const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  useEffect(() => {
    if (!token) return;
    const socket = io(backendUrl, { auth: { token } });
    
    socket.on('explanation_submitted', (updatedRecord) => {
      setLocalRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      toast.success(`Nhân viên đã nộp giải trình mới!`);
    });

    return () => { socket.disconnect(); };
  }, [token, backendUrl]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleRequestExplanation = async (id: number) => {
    try {
      await api.post(`/attendance/${id}/request-explanation`);
      toast.success('Đã gửi email yêu cầu giải trình!');
      setLocalRecords(prev => prev.map(r => r.id === id ? { ...r, explanationRequested: true } : r));
    } catch {
      toast.error('Lỗi khi gửi yêu cầu giải trình');
    }
  };

  const handleSubmitExplanation = async () => {
    if (!explanationText.trim() || !selectedRecordId) return toast.error('Vui lòng nhập lý do giải trình');
    setIsSubmitting(true);
    try {
      await api.post(`/attendance/${selectedRecordId}/submit-explanation`, { explanationText });
      toast.success('Đã nộp giải trình thành công!');
      setLocalRecords(prev => prev.map(r => r.id === selectedRecordId ? { ...r, explanationText } : r));
      setIsExplanationModalOpen(false);
      setExplanationText('');
    } catch {
      toast.error('Lỗi khi nộp giải trình');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mt-4">
      {daysArray.map(day => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = localRecords.find(r => r.date === dateStr);
        
        // Lấy ngày hiện tại theo giờ local
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const isPastMissingCheckout = record && record.checkInTime && !record.checkOutTime && dateStr < todayStr;
        let displayStatus = record?.status;
        if (isPastMissingCheckout) {
          displayStatus = 'Missing_Checkout';
        }

        let statusColor = 'bg-surface';
        let borderColor = 'border-border';
        
        if (record) {
          if (displayStatus === 'Present') {
            statusColor = 'bg-green-50 dark:bg-green-900/20';
            borderColor = 'border-green-200 dark:border-green-800';
          } else if (displayStatus === 'Leave') {
            statusColor = 'bg-blue-50 dark:bg-blue-900/20';
            borderColor = 'border-blue-200 dark:border-blue-800';
          } else if (displayStatus === 'Late') {
            statusColor = 'bg-orange-50 dark:bg-orange-900/20';
            borderColor = 'border-orange-200 dark:border-orange-800';
          } else {
            statusColor = 'bg-red-50 dark:bg-red-900/20';
            borderColor = 'border-red-200 dark:border-red-800';
          }
        }

        return (
          <div key={day} className={`p-3 rounded-lg border ${statusColor} ${borderColor} min-h-[120px] flex flex-col`}>
            <div className="font-bold text-sm mb-2">{day}/{month}</div>
            
            {!record ? (
              <span className="text-xs text-text-muted">Không có DL</span>
            ) : (
              <div className="flex-1 flex flex-col gap-2">
                <Badge variant={displayStatus === 'Present' ? 'active' : displayStatus === 'Leave' ? 'default' : 'danger'}>
                  {displayStatus === 'Present' ? 'Đúng giờ' : displayStatus === 'Leave' ? 'Nghỉ phép' : displayStatus === 'Late' ? 'Đi trễ' : displayStatus === 'Missing_Checkout' ? 'Thiếu giờ ra' : 'Vắng'}
                </Badge>
                <div className="text-[11px] text-text-sec">
                  {displayStatus === 'Leave' ? (
                    <div className="italic text-brand-600 dark:text-brand-400 mt-1 flex flex-col gap-0.5">
                      <span>{record.notes || 'Không có lý do'}</span>
                      {(record.checkInTime || record.checkOutTime) && (
                        <span className="font-semibold text-[10px] bg-brand-100 dark:bg-brand-900/30 px-1 py-0.5 rounded w-fit not-italic">
                          Từ {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--'} 
                          {' đến '}
                          {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      Vào: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('vi-VN') : '--'} <br/>
                      Ra: {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('vi-VN') : '--'}
                    </>
                  )}
                </div>

                {/* Explanation logic */}
                {(displayStatus === 'Late' || displayStatus === 'Absent' || displayStatus === 'Missing_Checkout') && (
                  <div className="mt-auto pt-2 border-t border-black/10 dark:border-white/10">
                    {record.explanationText ? (
                      <div className="text-[11px] bg-white dark:bg-black/20 p-1.5 rounded border border-brand-200 flex flex-col gap-1">
                        <span className="font-semibold text-brand-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Đã giải trình:</span>
                        <span className="text-text-primary italic">"{record.explanationText}"</span>
                      </div>
                    ) : !isManager ? (
                      <Button size="xs" variant={record.explanationRequested ? 'primary' : 'outline'} className={`w-full text-[10px] h-6 py-0 ${!record.explanationRequested && 'border-brand-500 text-brand-600'}`} onClick={() => {
                        setSelectedRecordId(record.id);
                        setIsExplanationModalOpen(true);
                      }}>
                        {record.explanationRequested ? 'Nộp giải trình (Bắt buộc)' : 'Nộp giải trình'}
                      </Button>
                    ) : record.explanationRequested ? (
                      <span className="text-[10px] text-orange-600 font-semibold flex items-center gap-1">
                        <Mail className="w-3 h-3"/> Đã gửi email YC
                      </span>
                    ) : (
                      <Button size="xs" variant="outline" className="w-full text-[10px] h-6 py-0 border-brand-500 text-brand-600" onClick={() => handleRequestExplanation(record.id)}>
                        <Mail className="w-3 h-3 mr-1" /> Yêu cầu giải trình
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Modal
        isOpen={isExplanationModalOpen}
        onClose={() => { setIsExplanationModalOpen(false); setExplanationText(''); }}
        title="Nộp giải trình đi muộn/vắng mặt"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-sec">
            Vui lòng ghi rõ lý do để quản lý xem xét và phê duyệt.
          </p>
          <textarea
            className="w-full rounded-md border border-border bg-surface text-sm p-3 min-h-[100px] focus:ring-2 focus:ring-brand-500/30"
            value={explanationText}
            onChange={(e) => setExplanationText(e.target.value)}
            placeholder="Ví dụ: Tắc đường do tai nạn ở đường X, Kẹt xe, Gặp khách hàng ngoài giờ..."
          ></textarea>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setIsExplanationModalOpen(false); setExplanationText(''); }}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSubmitExplanation} isLoading={isSubmitting}>
              Gửi giải trình
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
