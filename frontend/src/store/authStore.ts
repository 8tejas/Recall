import { create } from 'zustand';
import { User } from '../types';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('recall_token'),
  loading: true,

  loadUser: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, loading: false });
    } catch (e) {
      // In dev fallback or default mode, get default user
      try {
        const fallback = await api.get('/auth/me');
        set({ user: fallback.data, loading: false });
      } catch {
        set({ user: null, loading: false });
      }
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('recall_token', res.data.access_token);
    set({ token: res.data.access_token, user: res.data.user });
  },

  register: async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('recall_token', res.data.access_token);
    set({ token: res.data.access_token, user: res.data.user });
  },

  logout: () => {
    localStorage.removeItem('recall_token');
    set({ user: null, token: null });
  },
}));
