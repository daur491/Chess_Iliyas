import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from './game.entity';

@Entity('moves')
export class Move {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column()
  gameId: string;

  @Column({ nullable: true })
  playerId: string;

  @Column()
  moveSan: string;

  @Column()
  moveUci: string;

  @Column()
  fenAfter: string;

  @Column()
  moveNumber: number;

  @Column({ default: 0 })
  timeSpentMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
