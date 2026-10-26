import { create } from 'zustand';
import api from '../services/api';

interface SettingsState {
  settings: Record<string, string>;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
}

// Zustand Store quan ly cac cau hinh cai dat he thong (Setting Toggles: ENABLE_CHAT, ENABLE_POLICIES...)

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  isLoading: false,
  // Ham nay dung de lay toan bo cac cap key-value cau hinh cai dat he thong tu Backend
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/settings');
      set({ settings: res.data || {}, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error fetching settings:', error);
    }
  },
}));
