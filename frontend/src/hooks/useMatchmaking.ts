import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchmakingApi } from '../api/rest';
import { getSocket } from '../api/socket';
import { TimeControl } from '../types';

export const useMatchmaking = () => {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('match_found', ({ gameId, color }: { gameId: string; color: string }) => {
      setSearching(false);
      navigate(`/game/${gameId}`, { state: { color } });
    });

    return () => {
      socket.off('match_found');
    };
  }, [navigate]);

  const joinQueue = useCallback(async (timeControl: TimeControl) => {
    try {
      setSearching(true);
      setError(null);
      await matchmakingApi.join(timeControl);
    } catch (e: any) {
      setSearching(false);
      setError(e.message);
    }
  }, []);

  const leaveQueue = useCallback(async () => {
    try {
      await matchmakingApi.leave();
      setSearching(false);
    } catch {
      setSearching(false);
    }
  }, []);

  return { searching, error, joinQueue, leaveQueue };
};
