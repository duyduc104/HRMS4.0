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

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = toast.id || Math.random().toString(36).substring(2, 9);
    set((state) => {
      // Remove existing toast with same id if any, then add new one
      const filtered = state.toasts.filter(t => t.id !== id);
      return { toasts: [...filtered, { ...toast, id }] };
    });

    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, toast.duration || 4000);
    }
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Helper functions for easy access
export const toast = {
  success: (title: string, description?: string | { id: string }) => {
    let desc = typeof description === 'string' ? description : undefined;
    let id = typeof description === 'object' ? description.id : undefined;
    useToastStore.getState().addToast({ title, description: desc, variant: 'success', ...(id ? {id} : {}) } as any);
  },
  error: (title: string, description?: string | { id: string }) => {
    let desc = typeof description === 'string' ? description : undefined;
    let id = typeof description === 'object' ? description.id : undefined;
    useToastStore.getState().addToast({ title, description: desc, variant: 'error', duration: 8000, ...(id ? {id} : {}) } as any);
  },
  warning: (title: string, description?: string | { id: string }) => {
    let desc = typeof description === 'string' ? description : undefined;
    let id = typeof description === 'object' ? description.id : undefined;
    useToastStore.getState().addToast({ title, description: desc, variant: 'warning', ...(id ? {id} : {}) } as any);
  },
  info: (title: string, description?: string | { id: string }) => {
    let desc = typeof description === 'string' ? description : undefined;
    let id = typeof description === 'object' ? description.id : undefined;
    useToastStore.getState().addToast({ title, description: desc, variant: 'info', ...(id ? {id} : {}) } as any);
  },
  loading: (title: string, options?: { id: string }) => {
    let id = options?.id;
    useToastStore.getState().addToast({ title, variant: 'info', duration: 10000, ...(id ? {id} : {}) } as any);
  },
  dismiss: (id: string) => useToastStore.getState().removeToast(id),
};
