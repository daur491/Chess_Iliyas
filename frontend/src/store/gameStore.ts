import { create } from 'zustand';
import type { Game, GameMove, TimerState } from '../types';

interface GameState {
  game: Game | null;
  moves: GameMove[];
  timerState: TimerState | null;
  isGameOver: boolean;
  setGame: (game: Game) => void;
  setMoves: (moves: GameMove[]) => void;
  addMove: (move: GameMove) => void;
  updateFen: (fen: string) => void;
  setTimerState: (timer: TimerState) => void;
  updateTimers: (whiteMs: number, blackMs: number) => void;
  setGameOver: (isOver: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  game: null,
  moves: [],
  timerState: null,
  isGameOver: false,
  setGame: (game) => set({ game }),
  setMoves: (moves) => set({ moves }),
  addMove: (move) => set((s) => ({ moves: [...s.moves, move] })),
  updateFen: (fen) =>
    set((s) => s.game ? { game: { ...s.game, currentFen: fen } } : {}),
  setTimerState: (timerState) => set({ timerState }),
  updateTimers: (whiteMs, blackMs) =>
    set((s) =>
      s.timerState
        ? { timerState: { ...s.timerState, whiteMs, blackMs } }
        : {},
    ),
  setGameOver: (isGameOver) => set({ isGameOver }),
  reset: () =>
    set({ game: null, moves: [], timerState: null, isGameOver: false }),
}));
