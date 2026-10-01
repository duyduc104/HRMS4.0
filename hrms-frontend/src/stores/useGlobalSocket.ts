import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';
import { toast } from './useToastStore';

// Hiển thị modal cảnh báo với countdown và nút Đăng xuất ngay
function showConcurrentLoginModal(message: string, onLogout: () => void) {
  // Nếu đã có modal thì không tạo thêm
  if (document.getElementById('concurrent-login-modal')) return;

  let countdown = 5;
  const overlay = document.createElement('div');
  overlay.id = 'concurrent-login-modal';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, sans-serif;
    animation: fadeIn 0.3s ease;
  `;

  const updateHTML = () => {
    overlay.innerHTML = `
      <style>@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }</style>
      <div style="
        background: #1e1e2e; border: 1px solid #ef4444; border-radius: 16px;
        padding: 32px; max-width: 420px; width: 90%; text-align: center;
        box-shadow: 0 0 40px rgba(239,68,68,0.3);
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h2 style="color: #ef4444; font-size: 20px; font-weight: 700; margin-bottom: 12px;">
          Đăng nhập từ nơi khác
        </h2>
        <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
          ${message}
        </p>
        <div style="
          font-size: 48px; font-weight: 800; color: #ef4444;
          margin-bottom: 8px; line-height: 1;
        ">${countdown}</div>
        <p style="color: #71717a; font-size: 13px; margin-bottom: 24px;">
          Tự động đăng xuất sau <b style="color:#f87171">${countdown} giây</b>
        </p>
        <div style="display: flex; justify-content: center;">
          <button id="concurrent-logout-btn" style="
            background: #ef4444; color: white; border: none; border-radius: 10px;
            padding: 12px 32px; font-size: 15px; font-weight: 600; cursor: pointer;
            transition: background 0.2s;
          " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
            Đăng xuất ngay
          </button>
        </div>
      </div>
    `;
    document.getElementById('concurrent-logout-btn')?.addEventListener('click', () => {
      clearInterval(timer);
      overlay.remove();
      onLogout();
    });
  };

  updateHTML();
  document.body.appendChild(overlay);

  const timer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(timer);
      overlay.remove();
      onLogout();
    } else {
      updateHTML();
    }
  }, 1000);
}

export function useGlobalSocket() {
  const { token, logout } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    // Kết nối thẳng tới backend port 5000 để tránh lỗi WebSocket proxy của Vite
    const backendUrl = 'http://localhost:5000';
    const socket = io(backendUrl, {
      auth: { token },
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[GlobalSocket] Connected to server');
    });

    // LEAVE REQUESTS
    socket.on('new_leave_request', (data: any) => {
      window.dispatchEvent(new CustomEvent('add_notification', { detail: { type: 'leave', title: data.title, message: data.message, link: '/leave?tab=approval' } }));
      window.dispatchEvent(new CustomEvent('hrms_leave_updated'));
    });

    socket.on('leave_status_updated', (data: any) => {
      window.dispatchEvent(new CustomEvent('add_notification', { detail: { type: 'leave', title: data.title, message: data.message, link: '/leave?tab=my-leave' } }));
      window.dispatchEvent(new CustomEvent('hrms_leave_updated'));
    });

    // EXPLANATIONS
    socket.on('new_explanation_request', (data: any) => {
      window.dispatchEvent(new CustomEvent('add_notification', { detail: { type: 'explanation', title: data.title, message: data.message, link: '/leave?tab=approval-expl' } }));
      window.dispatchEvent(new CustomEvent('hrms_explanation_updated'));
    });

    socket.on('explanation_status_updated', (data: any) => {
      window.dispatchEvent(new CustomEvent('add_notification', { detail: { type: 'explanation', title: data.title, message: data.message, link: '/leave?tab=my-explanation' } }));
      window.dispatchEvent(new CustomEvent('hrms_explanation_updated'));
    });

    // AI PROACTIVE MESSAGES & QUEUE RESPONSES
    socket.on('ai_proactive_message', (data: any) => {
      window.dispatchEvent(new CustomEvent('ai_proactive_message', { detail: data }));
    });

    socket.on('ai_response', (data: any) => {
      window.dispatchEvent(new CustomEvent('ai_response', { detail: data }));
    });

    // CẢNH BÁO CHẤM CÔNG (LATE/ABSENT)
    socket.on('hrms_attendance_warning', (data: any) => {
      toast.error('CẢNH BÁO VI PHẠM', data.message);
      window.dispatchEvent(new CustomEvent('add_notification', {
        detail: { type: 'attendance', title: 'Cảnh báo vi phạm chấm công', message: data.message, link: '/attendance' }
      }));
    });

    // CẢNH BÁO BẢO MẬT
    socket.on('security_warning', (data: any) => {
      toast.error(data.title, data.message);
      window.dispatchEvent(new CustomEvent('add_notification', {
        detail: { type: 'security', title: data.title, message: data.message, link: '/blocked-warning' }
      }));
    });

    // ADMIN: CÓ GIẢI TRÌNH MỚI NỘP
    socket.on('new_violation_submitted', (data: any) => {
      toast.info('📬 GIẢI TRÌNH MỚI', 
        `${data.employeeName} vừa nộp một giải trình vi phạm cần duyệt!`);
      window.dispatchEvent(new CustomEvent('new_violation_submitted', { detail: data }));
    });

    // AI PHÁT HIỆN BẤT THƯỜNG ACCESS LOG → cảnh báo Admin
    socket.on('security_anomaly_alert', (data: any) => {
      toast.error('🚨 PHÁT HIỆN BẤT THƯỜNG', 
        `${data.employee?.fullName} đã truy cập ${data.blockedCount} URL bị cấm hôm nay!`);
      window.dispatchEvent(new CustomEvent('add_notification', {
        detail: { type: 'security', title: '🚨 Bất thường Access Log', 
                 message: `${data.employee?.fullName}: ${data.blockedCount} URL blocked`, 
                 link: '/security' }
      }));
    });

    // AUTO-LOGOUT THÔNG BÁO ADMIN
    socket.on('security_alert_auto_logout', (data: any) => {
      toast.error('🔒 AUTO-LOGOUT BẢO MẬT', 
        `${data.employee?.fullName} đã bị tự động đăng xuất!`);
      window.dispatchEvent(new CustomEvent('add_notification', {
        detail: { type: 'security', title: '🔒 Auto-Logout', 
                 message: `${data.employee?.fullName} bị logout do vi phạm`, 
                 link: '/security' }
      }));
    });

    // AI PHÂN TÍCH URL (từ Bull Queue, đến sau vài giây)
    socket.on('security_ai_analysis', (data: any) => {
      toast.info('🤖 AI Phân tích bảo mật', 
        `${data.employeeName}: Mức rủi ro ${data.analysis?.riskLevel}`);
      window.dispatchEvent(new CustomEvent('security_ai_analysis', { detail: data }));
    });

    // THÔNG BÁO CHÍNH SÁCH / SỰ KIỆN MỚI
    socket.on('new_policy_announcement', (data: any) => {
      const msg = data.message || `📢 Thông báo chính sách mới: ${data.policy?.title || ''}`;
      toast.info('CHÍNH SÁCH MỚI', msg);
      window.dispatchEvent(new CustomEvent('add_notification', {
        detail: { type: 'policy', title: 'Thông báo chính sách mới', message: msg, link: '/policies' }
      }));
    });

    // ĐĂNG NHẬP TRÙNG TÀI KHOẢN
    socket.on('force_logout', (data: any) => {
      // Đọc loginTime từ sessionStorage (riêng biệt theo từng cửa sổ trình duyệt, giữ nguyên khi F5)
      const currentLoginTime = parseInt(sessionStorage.getItem('hrms_session_login_time') || '0', 10);
      const newLoginTime = data?.loginTime || Date.now();

      console.log(`[GlobalSocket] force_logout: sessionLoginTime=${currentLoginTime}, newLoginTime=${newLoginTime}`);

      if (currentLoginTime >= newLoginTime) {
        // Đây là phiên MỚI - bỏ qua hoàn toàn (không bị đá khi F5)
        console.log('[GlobalSocket] Ignoring force_logout - this is the new session.');
        return;
      }

      // Đây là phiên CŨ - hiển thị modal cảnh báo với đếm ngược 5 giây
      showConcurrentLoginModal(
        data.message || 'Tài khoản của bạn vừa đăng nhập ở một nơi khác.',
        () => {
          logout();
          window.location.href = '/login';
        }
      );
    });

    // ADMIN FORCE LOGOUT (giữ lại chức năng admin đá nhân viên)
    socket.on('admin_force_logout', () => {
      toast.error('Đăng xuất', 'Admin đã đăng xuất phiên làm việc của bạn vì lý do bảo mật.');
      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 1500);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, logout]);
}


