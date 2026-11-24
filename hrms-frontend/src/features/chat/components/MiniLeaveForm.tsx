import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import api from '../../../services/api';

interface MiniLeaveFormData {
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: string;
}

export function MiniLeaveForm({ data }: { data: MiniLeaveFormData }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setStatus('loading');
    try {
      await api.post('/leaves', {
        leaveType: data.leaveType || 'Annual',
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason
      });
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Lỗi gửi đơn');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl flex items-center gap-2 mt-2">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Đã gửi đơn xin phép thành công!</span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border p-4 rounded-xl mt-2 shadow-sm w-64 max-w-full">
      <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-text-primary">
        <span>📝</span> Đơn xin nghỉ phép
      </h4>
      <div className="space-y-2 text-sm mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Bắt đầu</span>
          <span className="font-medium text-text-primary text-xs bg-surface-alt p-1.5 rounded">{new Date(data.startDate).toLocaleString('vi-VN')}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Kết thúc</span>
          <span className="font-medium text-text-primary text-xs bg-surface-alt p-1.5 rounded">{new Date(data.endDate).toLocaleString('vi-VN')}</span>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Lý do</span>
          <span className="font-medium text-text-primary text-xs break-words break-all whitespace-normal">{data.reason}</span>
        </div>
      </div>
      
      {status === 'error' && <p className="text-red-500 text-xs mb-2">{errorMsg}</p>}
      
      <button 
        onClick={handleSubmit}
        disabled={status === 'loading'}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {status === 'loading' ? 'Đang gửi...' : 'Xác nhận gửi'}
        {!status && <Send className="w-4 h-4" />}
      </button>
    </div>
  );
}
