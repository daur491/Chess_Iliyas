import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        localStorage.setItem('access_token', accessToken);
        set({ user, accessToken });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, accessToken: null });
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'chess-auth', partialize: (s) => ({ accessToken: s.accessToken }) },
  ),
);
