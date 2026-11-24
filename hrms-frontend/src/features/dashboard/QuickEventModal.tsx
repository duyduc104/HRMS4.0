import { useState } from 'react';
import { X, Calendar, Mail, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';

interface QuickEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: {
    action: string;
    target: string;
    label: string;
    prefill: { title: string; body: string };
  };
}

export function QuickEventModal({ isOpen, onClose, action }: QuickEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [target, setTarget] = useState(action.target);
  const [title, setTitle] = useState(action.prefill.title);
  const [body, setBody] = useState(action.prefill.body);
  const [meetLink, setMeetLink] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!scheduledAt) {
      toast.error('Lỗi', 'Vui lòng chọn thời gian!');
      return;
    }

    setLoading(true);
    try {
      const endpoint = action.action === 'schedule_meeting' ? '/events/meeting' : '/events/email';
      
      const res = await api.post(endpoint, {
        title: title,
        subject: title,
        body: body,
        to: target,
        scheduledAt: new Date(scheduledAt).toISOString(),
        ...(isMeeting ? { meetLink } : {})
      });

      if (res.status === 200 || res.status === 201) {
        toast.success('Thành công', 'Đã lưu sự kiện thành công!');
        onClose();
      } else {
        toast.error('Lỗi', res.data?.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      if (error.response?.data?.message === 'GOOGLE_AUTH_REQUIRED') {
        toast.error('Cần cấp quyền', error.response.data.error || 'Vui lòng liên kết tài khoản Google Calendar');
        try {
          const res = await api.get('/events/google/auth-url');
          if (res.data.url) {
            window.open(res.data.url, '_blank', 'width=600,height=700');
          }
        } catch (authErr) {
          toast.error('Lỗi', 'Không thể lấy đường dẫn xác thực Google');
        }
      } else {
        toast.error('Lỗi', error.response?.data?.message || 'Không thể kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  };

  const isMeeting = action.action === 'schedule_meeting';

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl overflow-hidden border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            {isMeeting ? <Calendar className="w-5 h-5 text-brand-500" /> : <Mail className="w-5 h-5 text-emerald-500" />}
            {isMeeting ? 'Tạo Lịch Họp Nhanh' : 'Gửi Mail Nhắc Nhở'}
          </h3>
          <button onClick={onClose} className="text-text-sec hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-text-sec mb-1">Gửi đến (Target)</label>
            <input type="text" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs text-text-sec mb-1">Tiêu đề (Subject)</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs text-text-sec mb-1">Nội dung (Body)</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} className="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 h-28" />
          </div>
          {isMeeting && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-text-sec">Link họp (Zoom / Google Meet)</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setMeetLink('');
                    toast.success('Đã chọn', 'Hệ thống sẽ tạo tự động link Google Meet khi Lưu!');
                  }}
                  className="text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  Tạo tự động
                </button>
              </div>
              <input 
                type="url" 
                value={meetLink} 
                onChange={e => setMeetLink(e.target.value)} 
                className="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500" 
                placeholder="Dán link vào đây hoặc ấn 'Tạo tự động'"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Chọn thời gian thực hiện <span className="text-danger">*</span></label>
            <input 
              type="datetime-local" 
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface-alt">
          <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
          <Button onClick={handleSubmit} disabled={loading} className={isMeeting ? "bg-brand-500" : "bg-emerald-500"}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isMeeting ? 'Tạo Lịch Họp' : 'Lên Lịch Gửi Mail'}
          </Button>
        </div>
      </div>
    </div>
  );
}
