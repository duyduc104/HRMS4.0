import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => void;
  removeToast: (id: string) => void;
}

// Zustand Store va tien ich quan ly thong bao Toast popup tren giao dien nguoi dung

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  // Ham nay dung de them mot thong bao moi vao danh sach va tu dong an sau thoi gian timeout
  addToast: (toast) => {
    const id = toast.id || Math.random().toString(36).substring(2, 9);
    set((state) => {
      // Xoa toast cu neu trung id va them toast moi
      const filtered = state.toasts.filter(t => t.id !== id);
      return { toasts: [...filtered, { ...toast, id }] };
    });

    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, toast.duration || 4000);
    }
  },
  // Ham nay dung de xoa bo thu cong mot thong bao theo id
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export type ToastOptions = string | { id?: string; duration?: number; description?: string };

// Tien ich giup goi nhanh cac loai thong bao Toast (success, error, warning, info, loading) o bat ky dau
export const toast = {
  // Ham nay dung de ban thong bao thanh cong (mau xanh la cay)
  success: (title: string, options?: ToastOptions) => {
    let desc = typeof options === 'string' ? options : options?.description;
    let id = typeof options === 'object' ? options.id : undefined;
    let duration = typeof options === 'object' ? options.duration : undefined;
    useToastStore.getState().addToast({ title, description: desc, variant: 'success', ...(id ? {id} : {}), ...(duration !== undefined ? {duration} : {}) });
  },
  // Ham nay dung de ban thong bao loi (mau do)
  error: (title: string, options?: ToastOptions) => {
    let desc = typeof options === 'string' ? options : options?.description;
    let id = typeof options === 'object' ? options.id : undefined;
    let duration = typeof options === 'object' && options.duration !== undefined ? options.duration : 8000;
    useToastStore.getState().addToast({ title, description: desc, variant: 'error', duration, ...(id ? {id} : {}) });
  },
  // Ham nay dung de ban thong bao canh bao (mau vang)
  warning: (title: string, options?: ToastOptions) => {
    let desc = typeof options === 'string' ? options : options?.description;
    let id = typeof options === 'object' ? options.id : undefined;
    let duration = typeof options === 'object' ? options.duration : undefined;
    useToastStore.getState().addToast({ title, description: desc, variant: 'warning', ...(id ? {id} : {}), ...(duration !== undefined ? {duration} : {}) });
  },
  // Ham nay dung de ban thong bao thong tin (mau xanh duong)
  info: (title: string, options?: ToastOptions) => {
    let desc = typeof options === 'string' ? options : options?.description;
    let id = typeof options === 'object' ? options.id : undefined;
    let duration = typeof options === 'object' ? options.duration : undefined;
    useToastStore.getState().addToast({ title, description: desc, variant: 'info', ...(id ? {id} : {}), ...(duration !== undefined ? {duration} : {}) });
  },
  // Ham nay dung de ban thong bao trang thai dang tai loading
  loading: (title: string, options?: { id?: string; duration?: number }) => {
    let id = options?.id;
    let duration = options?.duration || 10000;
    useToastStore.getState().addToast({ title, variant: 'info', duration, ...(id ? {id} : {}) });
  },
  // Ham nay dung de tat chu dong mot thong bao theo id
  dismiss: (id: string) => useToastStore.getState().removeToast(id),
};
