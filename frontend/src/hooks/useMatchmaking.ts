import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchmakingApi } from '../api/rest';
import type { TimeControl } from '../types';

const POLL_INTERVAL_MS = 2000;

export const useMatchmaking = () => {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      if (!searchingRef.current) {
        stopPolling();
        return;
      }
      try {
        const status = await matchmakingApi.status();
        if (status.gameId) {
          searchingRef.current = false;
          setSearching(false);
          stopPolling();
          navigate(`/game/${status.gameId}`, { state: { color: status.color } });
        }
      } catch {
        // ignore poll errors — keep trying
      }
    }, POLL_INTERVAL_MS);
  }, [navigate, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const joinQueue = useCallback(async (timeControl: TimeControl) => {
    try {
      searchingRef.current = true;
      setSearching(true);
      setError(null);
      await matchmakingApi.join(timeControl);
      startPolling();
    } catch (e: any) {
      searchingRef.current = false;
      setSearching(false);
      setError(e.message ?? 'Ошибка подключения');
    }
  }, [startPolling]);

  const leaveQueue = useCallback(async () => {
    searchingRef.current = false;
    stopPolling();
    setSearching(false);
    try {
      await matchmakingApi.leave();
    } catch {
      // ignore
    }
  }, [stopPolling]);

  return { searching, error, joinQueue, leaveQueue };
};
