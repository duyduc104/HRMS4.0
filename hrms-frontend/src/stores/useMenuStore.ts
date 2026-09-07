import { create } from 'zustand';
import api from '../services/api';

export interface MenuItemData {
  id: string;
  key: string;
  title: string;
  path: string;
  icon: string;
  order: number;
}

export interface MenuGroupData {
  title: string;
  adminOnly?: boolean;
  items: MenuItemData[];
}

interface MenuStore {
  menuGroups: MenuGroupData[];
  loading: boolean;
  loaded: boolean;
  fetchMenus: () => Promise<void>;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  menuGroups: [],
  loading: false,
  loaded: false,

  fetchMenus: async () => {
    try {
      set({ loading: true });
      const res = await api.get('/menu');
      set({ menuGroups: res.data || [], loaded: true, loading: false });
    } catch (err) {
      console.error('[useMenuStore] Không thể tải danh mục menu:', err);
      set({ loading: false });
    }
  }
}));
