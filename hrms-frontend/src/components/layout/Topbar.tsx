import { Bell, Search, Sun, Moon, Menu, LogOut, User, Mic, Loader2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CommandPalette } from '../shared/CommandPalette';
import { io } from 'socket.io-client';
import { useThemeStore } from '../../stores/useThemeStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from '../../stores/useToastStore';
import { Avatar } from '../ui/Avatar/Avatar';
import api from '../../services/api';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { theme, setTheme, lang, setLang } = useThemeStore();
  const { user, token, logout } = useAuthStore();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const employeesRef = useRef<any[]>([]);
  
  // Voice Smart Forms State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [cooldownVoice, setCooldownVoice] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldownVoice > 0) {
      timer = setInterval(() => setCooldownVoice(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownVoice]);

  // Page title mapping
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Tổng quan';
    if (path.startsWith('/employees')) return 'Quản lý Nhân viên';
    if (path.startsWith('/attendance')) return 'Chấm công';
    if (path.startsWith('/leave')) return 'Nghỉ phép';
    if (path.startsWith('/payroll')) return 'Bảng lương';
    if (path.startsWith('/performance')) return 'Hiệu suất (KPI)';
    if (path.startsWith('/security')) return 'Bảo mật & Log';
    if (path.startsWith('/settings')) return 'Cài đặt';
    if (path.startsWith('/chat')) return 'Mạng nội bộ';
    if (path.startsWith('/profile')) return 'Hồ sơ cá nhân';
    return 'Hệ thống Nhân sự';
  };

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Lấy danh sách nhân viên 1 lần để map tên
    api.get('/employees').then(res => {
      employeesRef.current = res.data.data || res.data;
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    
    const socket = io(backendUrl, {
      auth: { token }
    });

    // 1. Lắng nghe tin nhắn mới
    socket.on('receive_message', (data: any) => {
      if (data.senderId !== user.id?.toString()) {
        const sender = employeesRef.current.find(e => e.id.toString() === data.senderId?.toString());
        const senderName = sender ? sender.fullName : 'Đồng nghiệp';
        
        setNotifications(prev => [{
          id: Date.now() + Math.random(),
          type: 'chat',
          title: `Tin nhắn mới từ ${senderName}`,
          message: data.type === 'image' ? '[Hình ảnh]' : (data.content || '...'),
          link: `/chat?userId=${data.senderId}`,
          read: false,
          time: new Date()
        }, ...prev].slice(0, 10));
      }
    });

    // 2. Lắng nghe cảnh báo bảo mật (Dành cho admin)
    socket.on('new_access_log', (data: any) => {
      const isAdmin = user.role === 'admin' || user.roles?.some((r: any) => r.name === 'admin');
      if (data.action === 'blocked' && isAdmin) {
        setNotifications(prev => [{
          id: Date.now() + Math.random(),
          type: 'security',
          title: 'Cảnh báo bảo mật',
          message: `Nhân viên ${data.Employee?.fullName || 'Unknown'} truy cập web cấm.`,
          link: '/security',
          read: false,
          time: new Date()
        }, ...prev].slice(0, 10));
      }
    });

    // 3. Lắng nghe thông báo hệ thống chung (Họp, Công việc...)
    socket.on('new_notification', (data: any) => {
      setNotifications(prev => [{
        id: Date.now() + Math.random(),
        type: data.type || 'system',
        title: data.title,
        message: data.message,
        link: data.link || '/',
        read: false,
        time: new Date()
      }, ...prev].slice(0, 10));
      toast.info(data.title, data.message);
    });
    
    return () => {
      socket.disconnect();
    };
  }, [token, user, backendUrl]);

  useEffect(() => {
    const handleAddNotification = (e: any) => {
      const { type, title, message, link } = e.detail;
      setNotifications(prev => [{
        id: Date.now() + Math.random(),
        type: type || 'system',
        title,
        message,
        link: link || '/',
        read: false,
        time: new Date()
      }, ...prev].slice(0, 10));
    };

    window.addEventListener('add_notification', handleAddNotification);
    return () => window.removeEventListener('add_notification', handleAddNotification);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLang = () => {
    const newLang = lang === 'vi' ? 'en' : 'vi';
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    toast.info('Đã đăng xuất');
    navigate('/login');
  };

  const handleVoiceCommand = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Web Speech API). Vui lòng dùng Chrome hoặc Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Đang nghe... Hãy nói yêu cầu của bạn");
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setIsListening(false);
      setIsProcessingVoice(true);
      toast.info(`Đã nghe: "${text}". Đang xử lý...`);

      try {
        const res = await api.post('/chat/parse-voice', { text });
        const data = res.data;
        
        if (data.intent === 'leave_request') {
          toast.success("Đã hiểu ý! Đang mở Form xin nghỉ...");
          navigate('/leave', { state: { voiceData: data } });
        } else {
          toast.warning("Chưa hiểu rõ ý định của bạn. Vui lòng nói lại chi tiết hơn.");
        }
      } catch (error: any) {
        console.error("Voice parse error", error);
        if (error.response?.status === 429) {
          const retryTime = error.response.data?.retryAfter || 36;
          setCooldownVoice(retryTime);
          toast.error(`Hệ thống đang quá tải. Vui lòng đợi ${retryTime} giây để thử lại.`);
        } else {
          toast.error("Có lỗi xảy ra khi xử lý giọng nói.");
        }
      } finally {
        setIsProcessingVoice(false);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error !== 'no-speech') {
        toast.error(`Lỗi microphone: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <header className="h-16 fixed top-0 right-0 left-0 lg:left-64 bg-surface border-b border-border z-30 flex items-center justify-between px-4 lg:px-6 transition-all duration-300">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-2 text-text-sec hover:text-text-primary hover:bg-surface-alt rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Tiêu đề trang (Dynamic Breadcrumb) */}
        <h1 className="text-lg font-bold hidden sm:block md:w-48 lg:w-64 shrink-0 truncate">
          {getPageTitle()}
        </h1>

        <div className="w-full max-w-sm hidden md:block relative">
          <div className="flex gap-2 items-center">
            <div className="relative group cursor-pointer flex-1" onClick={() => setIsCommandPaletteOpen(true)}>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted group-hover:text-brand-500 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                readOnly
                type="text"
                className="w-full h-9 pl-9 pr-14 text-sm bg-surface-alt border border-transparent rounded-md cursor-pointer group-hover:bg-surface group-hover:border-brand-500/30 transition-all focus:outline-none placeholder:text-text-muted"
                placeholder="Tìm kiếm..." 
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-muted bg-surface border border-border rounded opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="text-[12px]">⌘</span>K
                </kbd>
              </div>
            </div>
            <button 
              onClick={handleVoiceCommand}
              disabled={isListening || isProcessingVoice || cooldownVoice > 0}
              className={`h-9 w-9 flex items-center justify-center rounded-md border transition-all ${
                cooldownVoice > 0 ? 'bg-red-50 text-red-500 border-red-200 cursor-not-allowed' :
                isListening ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' : 
                isProcessingVoice ? 'bg-brand-50 text-brand-500 border-brand-200' :
                'bg-surface-alt text-text-sec border-transparent hover:text-brand-500 hover:bg-surface hover:border-brand-500/30'
              }`}
              title={cooldownVoice > 0 ? `Vui lòng đợi ${cooldownVoice}s` : "Điều khiển bằng giọng nói"}
            >
              {cooldownVoice > 0 ? (
                <span className="text-[10px] font-bold">{cooldownVoice}s</span>
              ) : isProcessingVoice ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            <a 
              href="/hrms-extension.zip" 
              download 
              className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm whitespace-nowrap"
              title="Tải tiện ích (Extension) bảo mật cho trình duyệt"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold hidden xl:block">Tải Extension</span>
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
        <button 
          onClick={toggleLang}
          className="font-medium text-sm text-text-sec hover:text-brand-500 transition-colors"
        >
          {lang === 'vi' ? 'EN' : 'VI'}
        </button>

        <button 
          onClick={toggleTheme}
          className="p-2 text-text-sec hover:text-brand-500 hover:bg-surface-alt rounded-full transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative" ref={notifDropdownRef}>
          <button 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 text-text-sec hover:text-brand-500 hover:bg-surface-alt rounded-full transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-surface animate-pulse"></span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-[400px] bg-surface border border-border rounded-lg shadow-lg z-50 animate-slide-up flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border font-bold text-sm flex justify-between items-center bg-surface-alt/50">
                <span>Thông báo mới ({notifications.filter(n => !n.read).length})</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}
                    className="text-xs text-brand-500 hover:underline font-normal"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-text-muted flex flex-col items-center">
                    <Bell className="w-8 h-8 text-border mb-2 opacity-50" />
                    Không có thông báo nào.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <button 
                      key={notif.id}
                      className={`w-full text-left px-4 py-3 border-b border-border hover:bg-surface-alt transition-colors flex items-start gap-3 ${!notif.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                      onClick={() => {
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                        setShowNotifDropdown(false);
                        navigate(notif.link);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm whitespace-normal ${!notif.read ? 'font-semibold text-text-primary' : 'font-medium text-text-sec'}`}>{notif.title}</p>
                        <p className="text-xs text-text-muted whitespace-normal mt-0.5">{notif.message ? notif.message.replace(/ GMT\+\d{4} \([^)]+\)/g, '') : ''}</p>
                        <p className="text-[10px] text-brand-500 mt-1.5 font-medium">{new Date(notif.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-border mx-1"></div>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar size="sm" alt={user?.fullName || user?.name || 'User'} fallback={(user?.fullName || user?.name)?.charAt(0) || 'U'} status="online" />
            <span className="text-sm font-medium hidden md:block">{user?.fullName || user?.name || 'User'}</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50 animate-slide-up">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium">{user?.fullName || user?.name}</p>
                <p className="text-xs text-text-sec truncate">{user?.email}</p>
              </div>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-alt flex items-center gap-2"
                onClick={() => { setShowDropdown(false); navigate('/profile'); }}
              >
                <User className="w-4 h-4" /> Hồ sơ cá nhân
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </header>
  );
}
