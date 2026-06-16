import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchmakingApi } from '../api/rest';
import { getSocket } from '../api/socket';
import type { TimeControl } from '../types';

export const useMatchmaking = () => {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchingRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    const onMatchFound = ({ gameId, color }: { gameId: string; color: string }) => {
      searchingRef.current = false;
      setSearching(false);
      navigate(`/game/${gameId}`, { state: { color } });
    };

    socket.on('match_found', onMatchFound);

    return () => {
      socket.off('match_found', onMatchFound);
    };
  }, [navigate]);

  const joinQueue = useCallback(async (timeControl: TimeControl) => {
    try {
      searchingRef.current = true;
      setSearching(true);
      setError(null);
      await matchmakingApi.join(timeControl);
    } catch (e: any) {
      searchingRef.current = false;
      setSearching(false);
      setError(e.message ?? 'Ошибка подключения');
    }
  }, []);

  const leaveQueue = useCallback(async () => {
    try {
      searchingRef.current = false;
      await matchmakingApi.leave();
      setSearching(false);
    } catch {
      setSearching(false);
    }
  }, []);

  return { searching, error, joinQueue, leaveQueue };
};
