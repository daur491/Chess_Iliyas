import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Puzzle } from './puzzle.entity';

@Entity('puzzle_attempts')
export class PuzzleAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Puzzle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'puzzleId' })
  puzzle: Puzzle;

  @Column()
  puzzleId: string;

  @Column({ default: false })
  solved: boolean;

  @Column({ default: 0 })
  attemptsCount: number;

  @Column({ default: false })
  solutionShown: boolean;

  @Column({ nullable: true })
  solvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
