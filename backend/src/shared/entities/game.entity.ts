import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum TimeControl {
  CORRESPONDENCE_1D = 'correspondence_1d',
  CORRESPONDENCE_3D = 'correspondence_3d',
  CORRESPONDENCE_7D = 'correspondence_7d',
  RAPID_10 = 'rapid_10',
  RAPID_15 = 'rapid_15',
  RAPID_30 = 'rapid_30',
  BLITZ_3 = 'blitz_3',
  BLITZ_5 = 'blitz_5',
  BULLET_1 = 'bullet_1',
}

export enum GameStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  FINISHED = 'finished',
  ABANDONED = 'abandoned',
}

export enum GameResult {
  WHITE_WIN = 'white_win',
  BLACK_WIN = 'black_win',
  DRAW = 'draw',
  ABORTED = 'aborted',
}

export enum GameEndReason {
  CHECKMATE = 'checkmate',
  RESIGN = 'resign',
  TIMEOUT = 'timeout',
  STALEMATE = 'stalemate',
  THREEFOLD = 'threefold',
  FIFTY_MOVE = 'fifty_move',
  INSUFFICIENT = 'insufficient',
  DRAW_AGREEMENT = 'draw_agreement',
  ABANDONMENT = 'abandonment',
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'whiteId' })
  white: User;

  @Column({ nullable: true })
  whiteId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'blackId' })
  black: User;

  @Column({ nullable: true })
  blackId: string;

  @Column({ nullable: true })
  botLevel: number;

  @Column({ default: false })
  isVsBot: boolean;

  @Column({ type: 'enum', enum: TimeControl })
  timeControl: TimeControl;

  @Column({ default: 600 })
  timeSeconds: number;

  @Column({ type: 'enum', enum: GameStatus, default: GameStatus.WAITING })
  status: GameStatus;

  @Column({ type: 'enum', enum: GameResult, nullable: true })
  result: GameResult;

  @Column({ type: 'enum', enum: GameEndReason, nullable: true })
  endReason: GameEndReason;

  @Column({ nullable: true, type: 'text' })
  pgn: string;

  @Column({ default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' })
  currentFen: string;

  @Column({ default: 0 })
  whiteEloChange: number;

  @Column({ default: 0 })
  blackEloChange: number;

  @Column({ nullable: true })
  drawOfferedBy: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;
}
