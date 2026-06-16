import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { TimeControl } from './game.entity';
import { TournamentParticipant } from './tournament-participant.entity';

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  REGISTRATION = 'registration',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export enum TournamentFormat {
  SWISS = 'swiss',
}

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: TournamentFormat, default: TournamentFormat.SWISS })
  format: TournamentFormat;

  @Column({ type: 'enum', enum: TimeControl })
  timeControl: TimeControl;

  @Column({ type: 'enum', enum: TournamentStatus, default: TournamentStatus.UPCOMING })
  status: TournamentStatus;

  @Column({ default: 64 })
  maxPlayers: number;

  @Column({ default: 7 })
  rounds: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @OneToMany(() => TournamentParticipant, (p) => p.tournament)
  participants: TournamentParticipant[];

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
