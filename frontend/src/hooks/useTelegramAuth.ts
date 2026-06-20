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

        const devAuth = import.meta.env.VITE_DEV_AUTH === 'true';
        const tg = await waitForTelegram();
        const initData = tg?.initData;

        // Local/browser dev: skip Telegram and log in as a dev user.
        if (devAuth && !initData) {
          const { accessToken, user } = await authApi.devLogin();
          setAuth(user, accessToken);
          return;
        }

        if (!tg) {
          throw new Error('Not running in Telegram');
        }

        tg.ready();
        tg.expand();

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
