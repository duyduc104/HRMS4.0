import { useState, useEffect } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { ToastProvider } from '../ui/Toast/ToastProvider';
import { useThemeStore } from '../../stores/useThemeStore';
import { ChatbotWidget } from '../../features/chat/ChatbotWidget';
import { useGlobalSocket } from '../../stores/useGlobalSocket';
import '../../i18n'; // ensure i18n is initialized
import { useNavigate } from 'react-router-dom';
import { isExtensionActive } from '../../utils/checkExtension';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from '../../stores/useToastStore';
import { SecurityViolationGuard } from './SecurityViolationGuard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  // Initialize global socket connection for real-time notifications
  useGlobalSocket();

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Giám sát Extension, chỉ logout nếu tài khoản BẮT BUỘC cài Extension
  useEffect(() => {
    // Nếu user không cần Extension (admin, hr_manager...) thì không cần giám sát
    if (!user || !user.requiresExtension) return;

    const interval = setInterval(async () => {
      if (!isExtensionActive()) {
        // User bắt buộc cài Extension mà Extension bị tắt -> Log và logout
        try {
          await fetch('http://localhost:5000/api/web-filters/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: user.id,
              url: window.location.href,
              action: 'extension_disabled',
              os: navigator.userAgent,
              browser: 'Chrome/Edge',
              device: 'Desktop'
            })
          });
        } catch (e) {
          console.error('Lỗi khi gửi log tắt extension', e);
        }
        
        logout();
        navigate('/login');
        toast.error("Phát hiện tắt Extension bảo mật. Tài khoản đã bị đăng xuất!");
      }
    }, 5000); // Quét mỗi 5 giây

    return () => clearInterval(interval);
  }, [logout, navigate, user]);

  return (
    <div className="min-h-screen bg-bg text-text-primary flex">
      <SecurityViolationGuard>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <Topbar onToggleSidebar={() => setSidebarOpen(true)} />
          
          <main className="flex-1 mt-16 p-4 lg:p-6 overflow-x-hidden">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        <ChatbotWidget />
      </SecurityViolationGuard>
      <ToastProvider />
    </div>
  );
}
