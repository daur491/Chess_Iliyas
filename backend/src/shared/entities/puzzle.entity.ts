import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum PuzzleCategory {
  MATE_IN_1 = 'mate_in_1',
  MATE_IN_2 = 'mate_in_2',
  FORK = 'fork',
  PIN = 'pin',
  DOUBLE_ATTACK = 'double_attack',
  DEFLECTION = 'deflection',
  ENDGAME = 'endgame',
  TACTICS = 'tactics',
}

export enum PuzzleDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('puzzles')
export class Puzzle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fen: string;

  @Column({ type: 'simple-array' })
  solutionMoves: string[];

  @Column({ type: 'enum', enum: PuzzleCategory })
  category: PuzzleCategory;

  @Column({
    type: 'enum',
    enum: PuzzleDifficulty,
    default: PuzzleDifficulty.MEDIUM,
  })
  difficulty: PuzzleDifficulty;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  explanation: string;

  @Column({ default: 0 })
  timesAttempted: number;

  @Column({ default: 0 })
  timesSolved: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
