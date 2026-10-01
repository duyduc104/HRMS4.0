import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name?: string;
  fullName?: string;
  username?: string;
  email: string;
  role: 'admin' | 'hr_manager' | 'employee';
  roles?: string[];
  avatar?: string;
  requiresExtension?: boolean;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  permissions: string[];
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      login: (token, user) => {
        set({ token, user, isAuthenticated: true });
        // Lưu loginTime từ token vào sessionStorage (riêng biệt theo từng cửa sổ trình duyệt)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.loginTime) {
            sessionStorage.setItem('hrms_session_login_time', String(payload.loginTime));
          }
        } catch {}
        // Bắn sự kiện ra window để Extension bắt được và tự động login
        window.postMessage({ type: 'HRMS_SYNC_LOGIN', token, employeeId: user.id }, '*');
      },
      logout: () => {
        sessionStorage.removeItem('hrms_session_login_time');
        set({ token: null, user: null, isAuthenticated: false, permissions: [] });
        // Bắn sự kiện ra window để Extension tự động logout
        window.postMessage({ type: 'HRMS_SYNC_LOGOUT' }, '*');
      },
    }),
    {
      name: 'hrms-auth-storage',
    }
  )
);
