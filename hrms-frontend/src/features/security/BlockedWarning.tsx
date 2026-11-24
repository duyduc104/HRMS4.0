import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { useNavigate } from 'react-router-dom';

export function BlockedWarning() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-lg p-8 text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-3">Truy cập bị chặn!</h1>
        <p className="text-text-sec mb-8">
          Trang web bạn đang cố gắng truy cập đã bị quản trị viên chặn do vi phạm chính sách bảo mật nội bộ của công ty. Hành động của bạn đã được ghi lại.
        </p>
        
        <Button onClick={() => navigate('/')} className="w-full">
          Quay lại trang chủ an toàn
        </Button>
      </div>
    </div>
  );
}
