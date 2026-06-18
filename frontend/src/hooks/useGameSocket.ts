import { useEffect, useCallback, useRef, useState } from 'react';
import { getSocket } from '../api/socket';
import { useGameStore } from '../store/gameStore';
import type { GameMove } from '../types';

interface MoveEvent {
  move: GameMove;
  fen: string;
  isGameOver: boolean;
  gameResult: string | null;
  endReason: string | null;
  whiteEloChange: number | null;
  blackEloChange: number | null;
}

export const useGameSocket = (gameId: string | undefined) => {
  const { setGame, setMoves, addMove, updateFen, setTimerState, updateTimers, setGameOver } =
    useGameStore();
  const joinedRef = useRef(false);
  const [drawOfferedBy, setDrawOfferedBy] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    joinedRef.current = false;
    setDrawOfferedBy(null);

    const socket = getSocket();

    const joinGame = () => {
      if (joinedRef.current) return;
      joinedRef.current = true;
      socket.emit('join_game', { gameId });
    };

    if (socket.connected) {
      joinGame();
    } else {
      socket.on('connect', joinGame);
    }

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message);
    });

    socket.on('game_state', ({ game, moves, timerState }: any) => {
      setGame(game);
      setMoves(moves);
      if (timerState) setTimerState(timerState);
      // Restore draw offer state from game (e.g. after reconnect)
      if (game?.drawOfferedBy) setDrawOfferedBy(game.drawOfferedBy);
    });

    socket.on('move_made', (event: MoveEvent) => {
      addMove(event.move);
      updateFen(event.fen);
      if (event.isGameOver) setGameOver(true);
      // A move implicitly rejects any pending draw offer
      setDrawOfferedBy(null);
    });

    socket.on('draw_offered', ({ by }: { by: string }) => {
      setDrawOfferedBy(by);
    });

    socket.on('timer_update', ({ whiteMs, blackMs }: { whiteMs: number; blackMs: number }) => {
      updateTimers(whiteMs, blackMs);
    });

    socket.on('game_over', () => {
      setGameOver(true);
      setDrawOfferedBy(null);
    });

    socket.on('timeout', () => {
      setGameOver(true);
      setDrawOfferedBy(null);
    });

    return () => {
      socket.off('connect', joinGame);
      socket.off('connect_error');
      socket.off('game_state');
      socket.off('move_made');
      socket.off('draw_offered');
      socket.off('timer_update');
      socket.off('game_over');
      socket.off('timeout');
    };
  }, [gameId]);

  const sendMove = useCallback(
    (move: string) => {
      if (!gameId) return;
      getSocket().emit('move', { gameId, move });
    },
    [gameId],
  );

  const offerDraw = useCallback(() => {
    if (!gameId) return;
    getSocket().emit('draw_offer', { gameId });
  }, [gameId]);

  const acceptDraw = useCallback(() => {
    if (!gameId) return;
    getSocket().emit('draw_accept', { gameId });
  }, [gameId]);

  const resign = useCallback(() => {
    if (!gameId) return;
    getSocket().emit('resign', { gameId });
  }, [gameId]);

  return { sendMove, offerDraw, acceptDraw, resign, drawOfferedBy };
};
