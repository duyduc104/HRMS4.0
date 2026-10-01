import { create } from 'zustand';
import api from '../services/api';

interface SettingsState {
  settings: Record<string, string>;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  isLoading: false,
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
