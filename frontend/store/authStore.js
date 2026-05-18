import { create } from 'zustand';
import { api } from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: false,
  loading: true,

  init: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      set({ loading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.success) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        get().logout();
      }
    } catch (err) {
      get().logout();
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.success) {
        const { accessToken, user } = response.data;
        localStorage.setItem('token', accessToken);
        set({
          token: accessToken,
          user,
          isAuthenticated: true,
          loading: false,
        });
        return { success: true };
      }
    } catch (error) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  register: async (companyName, name, email, phone, password, industry) => {
    set({ loading: true });
    try {
      const response = await api.post('/auth/register', {
        companyName,
        name,
        email,
        phone,
        password,
        industry,
      });
      if (response.success) {
        const { accessToken, user } = response.data;
        localStorage.setItem('token', accessToken);
        set({
          token: accessToken,
          user,
          isAuthenticated: true,
          loading: false,
        });
        return { success: true };
      }
    } catch (error) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  },
}));

export default useAuthStore;
