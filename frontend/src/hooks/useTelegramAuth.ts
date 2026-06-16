import { useEffect, useState } from 'react';
import { authApi, usersApi } from '../api/rest';
import { useAuthStore } from '../store/authStore';

declare global {
  interface Window {
    Telegram?: { WebApp: any };
  }
}

export const useTelegramAuth = () => {
  const { setAuth, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authenticate = async () => {
      try {
        if (isAuthenticated()) {
          try {
            const user = await usersApi.me();
            useAuthStore.getState().setUser(user);
            setLoading(false);
            return;
          } catch {
            // Token expired — re-auth below
            useAuthStore.getState().logout();
          }
        }

        if (import.meta.env.DEV) {
          const { accessToken, user } = await authApi.devLogin();
          setAuth(user, accessToken);
          setLoading(false);
          return;
        }

        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData;

        if (!initData) {
          throw new Error('Not running in Telegram');
        }

        tg.ready();
        tg.expand();

        const { accessToken, user } = await authApi.telegram(initData);
        setAuth(user, accessToken);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, []);

  return { loading, error };
};
