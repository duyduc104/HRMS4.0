import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark' | 'system';
  lang: 'vi' | 'en';
  setTheme: (t: ThemeStore['theme']) => void;
  setLang: (l: ThemeStore['lang']) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      lang: 'vi',
      setTheme: (theme) => {
        set({ theme });
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setLang: (lang) => {
        set({ lang });
        // Assume i18n.changeLanguage(lang) is called outside or here if i18n is imported
      },
    }),
    {
      name: 'hrms-theme-storage',
    }
  )
);
