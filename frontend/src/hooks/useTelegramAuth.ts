import { useEffect, useState } from 'react';
import { authApi, usersApi } from '../api/rest';
import { useAuthStore } from '../store/authStore';

declare global {
  interface Window {
    Telegram?: { WebApp: any };
  }
}

const waitForTelegram = (maxWaitMs = 3000): Promise<any> => {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const tg = window.Telegram?.WebApp;
      if (tg) return resolve(tg);
      if (Date.now() - start > maxWaitMs) return resolve(null);
      setTimeout(check, 100);
    };
    check();
  });
};

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
            useAuthStore.getState().logout();
          }
        }

        const tg = await waitForTelegram();

        if (!tg) {
          throw new Error('Not running in Telegram');
        }

        tg.ready();
        tg.expand();

        const initData = tg.initData;

        if (!initData) {
          throw new Error('Telegram initData is empty. Please open via Telegram bot.');
        }

        const { accessToken, user } = await authApi.telegram(initData);
        setAuth(user, accessToken);
      } catch (e: any) {
        setError(e.message ?? 'Auth failed');
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, []);

  return { loading, error };
};
