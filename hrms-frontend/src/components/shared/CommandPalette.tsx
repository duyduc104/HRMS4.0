import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, LayoutDashboard, Settings, ShieldAlert, FileText, MessageCircle, Moon, Sun, LogOut } from 'lucide-react';
import api from '../../services/api';
import { useThemeStore } from '../../stores/useThemeStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { logout, user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      
      // Fetch employees if not fetched yet
      if (employees.length === 0) {
        api.get('/employees').then(res => setEmployees(res.data.data || res.data)).catch(console.error);
      }
    }
  }, [isOpen]);

  // Define static actions and pages
  const staticItems = [
    { id: 'p1', type: 'page', title: 'Tổng quan (Dashboard)', icon: <LayoutDashboard className="w-4 h-4" />, action: () => navigate('/') },
    { id: 'p2', type: 'page', title: 'Mạng nội bộ (Chat)', icon: <MessageCircle className="w-4 h-4" />, action: () => navigate('/chat') },
    { id: 'p3', type: 'page', title: 'Onboarding', icon: <FileText className="w-4 h-4" />, action: () => navigate('/onboarding') },
    { id: 'p4', type: 'page', title: 'Lịch & Sự kiện', icon: <FileText className="w-4 h-4" />, action: () => navigate('/events') },
    { id: 'p5', type: 'page', title: 'Quản lý nhân viên', icon: <User className="w-4 h-4" />, action: () => navigate('/employees') },
    { id: 'p6', type: 'page', title: 'Chấm công', icon: <FileText className="w-4 h-4" />, action: () => navigate('/attendance') },
    { id: 'p7', type: 'page', title: 'Nghỉ phép', icon: <FileText className="w-4 h-4" />, action: () => navigate('/leave') },
    { id: 'p8', type: 'page', title: 'Lương (Payroll)', icon: <FileText className="w-4 h-4" />, action: () => navigate('/payroll') },
    ...((user?.role as string) === 'admin' || (user?.role as string) === 'hr_manager' || (user?.role as string) === 'department_manager' ? [
      { id: 'p9', type: 'page', title: 'Hiệu suất (KPI / OKR)', icon: <FileText className="w-4 h-4" />, action: () => navigate('/performance') },
    ] : []),
    ...(user?.role === 'admin' || user?.roles?.some((r: any) => r.name === 'admin') ? [
      { id: 'p10', type: 'page', title: 'Bảo mật & Log', icon: <ShieldAlert className="w-4 h-4" />, action: () => navigate('/security') },
      { id: 'p11', type: 'page', title: 'Cài đặt hệ thống', icon: <Settings className="w-4 h-4" />, action: () => navigate('/settings') }
    ] : []),
    { id: 'a1', type: 'action', title: `Đổi giao diện sang ${theme === 'dark' ? 'Sáng' : 'Tối'}`, icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    { id: 'a2', type: 'action', title: 'Đăng xuất', icon: <LogOut className="w-4 h-4" />, action: () => { logout(); navigate('/login'); } }
  ];

  // Filter items based on query
  const searchLower = query.toLowerCase();
  
  const filteredStatic = staticItems.filter(item => item.title.toLowerCase().includes(searchLower));
  
  const filteredEmployees = employees
    .filter(emp => emp.fullName?.toLowerCase().includes(searchLower) || emp.code?.toLowerCase().includes(searchLower))
    .slice(0, 5) // Limit to top 5
    .map(emp => ({
      id: `e_${emp.id}`,
      type: 'employee',
      title: `Nhắn tin cho ${emp.fullName}`,
      icon: <MessageCircle className="w-4 h-4" />,
      action: () => navigate(`/chat?userId=${emp.id}`)
    }));

  const results = [...filteredStatic, ...filteredEmployees];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        results[selectedIndex]?.action();
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-surface-alt">
          <Search className="w-5 h-5 text-text-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg focus:outline-none text-text-primary placeholder:text-text-muted"
            placeholder="Tìm kiếm ứng dụng, chức năng hoặc đồng nghiệp..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0); // Reset index on search
            }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-text-muted bg-surface border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              Không tìm thấy kết quả nào cho "{query}"
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'text-text-primary hover:bg-surface-alt'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                >
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-surface-alt text-text-sec'}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{item.title}</span>
                  </div>
                  {item.type === 'employee' && (
                    <span className="text-[10px] uppercase font-bold text-text-muted">Nhân viên</span>
                  )}
                  {item.type === 'action' && (
                    <span className="text-[10px] uppercase font-bold text-text-muted">Hành động</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-surface-alt flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface font-mono">↓</kbd>
              Điều hướng
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface font-mono">↵</kbd>
              Chọn
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
