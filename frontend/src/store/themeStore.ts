import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  initTheme: () => {
    const saved = localStorage.getItem('recall_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    set({ isDark });
  },

  toggleTheme: () => {
    const nextIsDark = !get().isDark;
    if (nextIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('recall_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('recall_theme', 'light');
    }
    set({ isDark: nextIsDark });
  },
}));
