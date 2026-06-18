export interface User {
  id: string;
  telegramId: string;
  username: string;
  avatarUrl?: string;
  elo: number;
  bestElo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  puzzlesSolved: number;
  puzzlesAttempted: number;
  status: 'online' | 'in_game' | 'offline';
  isAdmin: boolean;
  createdAt: string;
}

export type TimeControl =
  | 'correspondence_1d'
  | 'correspondence_3d'
  | 'correspondence_7d'
  | 'rapid_10'
  | 'rapid_15'
  | 'rapid_30'
  | 'blitz_3'
  | 'blitz_5'
  | 'bullet_1';

export type GameStatus = 'waiting' | 'active' | 'finished' | 'abandoned';
export type GameResult = 'white_win' | 'black_win' | 'draw' | 'aborted';
export type GameEndReason =
  | 'checkmate'
  | 'resign'
  | 'timeout'
  | 'stalemate'
  | 'threefold'
  | 'fifty_move'
  | 'insufficient'
  | 'draw_agreement'
  | 'abandonment';

export interface Game {
  id: string;
  white?: User;
  whiteId?: string;
  black?: User;
  blackId?: string;
  isVsBot: boolean;
  botLevel?: number;
  timeControl: TimeControl;
  timeSeconds: number;
  status: GameStatus;
  result?: GameResult;
  endReason?: GameEndReason;
  pgn?: string;
  currentFen: string;
  whiteEloChange: number;
  blackEloChange: number;
  drawOfferedBy?: string | null;
  startedAt: string;
  endedAt?: string;
}

export interface GameMove {
  id: string;
  gameId: string;
  playerId: string;
  moveSan: string;
  moveUci: string;
  fenAfter: string;
  moveNumber: number;
  timeSpentMs: number;
  createdAt: string;
}

export type PuzzleCategory =
  | 'mate_in_1'
  | 'mate_in_2'
  | 'fork'
  | 'pin'
  | 'double_attack'
  | 'deflection'
  | 'endgame'
  | 'tactics';

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  fen: string;
  solutionMoves: string[];
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  title: string;
  explanation?: string;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Tournament {
  id: string;
  name: string;
  format: string;
  timeControl: TimeControl;
  status: 'upcoming' | 'registration' | 'active' | 'finished';
  maxPlayers: number;
  rounds: number;
  description?: string;
  participants: TournamentParticipant[];
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  user?: User;
  score: number;
  buchholz: number;
  rank?: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  elo: number;
  puzzlesSolved: number;
  score: number;
}

export interface TimerState {
  whiteMs: number;
  blackMs: number;
  currentTurn: 'white' | 'black';
  lastMoveAt: number;
  running: boolean;
}
