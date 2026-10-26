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
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Zustand Store quan ly trang thai xac thuc, phien dang nhap va dong bo voi Chrome Extension
// Giai thich code khong thuan:
// - Su dung Zustand persist luu tru token va user profile vao localStorage (key: hrms-auth-storage).
// - Dong bo thoi gian phien loginTime tu JWT payload vao sessionStorage rieng cho tung tab.
// - Dong bo hai chieu voi Chrome Extension: Khi login/logout, he thong phat tin hieu window.postMessage (HRMS_SYNC_LOGIN / HRMS_SYNC_LOGOUT) de Extension tu dong cap nhat trang thai giam sat URL.

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      // Ham nay dung de luu thong tin dang nhap, token JWT va ban tin hieu dong bo sang Chrome Extension
      login: (token, user) => {
        set({ token, user, isAuthenticated: true });
        // Luu loginTime tu token vao sessionStorage
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.loginTime) {
            sessionStorage.setItem('hrms_session_login_time', String(payload.loginTime));
          }
        } catch {}
        // Ban su kien ra window de Extension bat duoc va tu dong login
        window.postMessage({ type: 'HRMS_SYNC_LOGIN', token, employeeId: user.id }, '*');
      },
      // Ham nay dung de cap nhat mot phan thong tin ca nhan cua nguoi dung trong bo nho state
      updateUser: (partial) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        }));
      },
      // Ham nay dung de xoa sach phien dang nhap va ban tin hieu logout sang Chrome Extension
      logout: () => {
        sessionStorage.removeItem('hrms_session_login_time');
        set({ token: null, user: null, isAuthenticated: false, permissions: [] });
        // Ban su kien ra window de Extension tu dong logout
        window.postMessage({ type: 'HRMS_SYNC_LOGOUT' }, '*');
      },
    }),
    {
      name: 'hrms-auth-storage',
    }
  )
);
