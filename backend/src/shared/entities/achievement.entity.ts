import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AchievementType {
  FIRST_WIN = 'first_win',
  WIN_STREAK_5 = 'win_streak_5',
  WIN_STREAK_10 = 'win_streak_10',
  GAMES_10 = 'games_10',
  GAMES_50 = 'games_50',
  GAMES_100 = 'games_100',
  PUZZLES_10 = 'puzzles_10',
  PUZZLES_50 = 'puzzles_50',
  PUZZLES_100 = 'puzzles_100',
  PUZZLE_PERFECT = 'puzzle_perfect',
  ELO_1400 = 'elo_1400',
  ELO_1500 = 'elo_1500',
  ELO_1700 = 'elo_1700',
  ELO_2000 = 'elo_2000',
  TOURNAMENT_WIN = 'tournament_win',
  TOURNAMENT_PARTICIPATE = 'tournament_participate',
  DAILY_PUZZLE = 'daily_puzzle',
  DAILY_PUZZLE_7 = 'daily_puzzle_7',
  CHECKMATE_SCHOLAR = 'checkmate_scholar',
  FIRST_DRAW = 'first_draw',
}

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: AchievementType })
  type: AchievementType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 1 })
  target: number;

  @Column({ default: false })
  unlocked: boolean;

  @Column({ nullable: true })
  unlockedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
