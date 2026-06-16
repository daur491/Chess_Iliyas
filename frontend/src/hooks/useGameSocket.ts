import { useEffect, useCallback } from 'react';
import { getSocket } from '../api/socket';
import { useGameStore } from '../store/gameStore';
import { GameMove } from '../types';

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

  useEffect(() => {
    if (!gameId) return;
    const socket = getSocket();

    socket.emit('join_game', { gameId });

    socket.on('game_state', ({ game, moves, timerState }: any) => {
      setGame(game);
      setMoves(moves);
      if (timerState) setTimerState(timerState);
    });

    socket.on('move_made', (event: MoveEvent) => {
      addMove(event.move);
      updateFen(event.fen);
      if (event.isGameOver) setGameOver(true);
    });

    socket.on('timer_update', ({ whiteMs, blackMs }: { whiteMs: number; blackMs: number }) => {
      updateTimers(whiteMs, blackMs);
    });

    socket.on('game_over', () => setGameOver(true));
    socket.on('timeout', () => setGameOver(true));

    return () => {
      socket.off('game_state');
      socket.off('move_made');
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

  const resign = useCallback(() => {
    if (!gameId) return;
    getSocket().emit('resign', { gameId });
  }, [gameId]);

  return { sendMove, offerDraw, resign };
};
