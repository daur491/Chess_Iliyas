import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum UserStatus {
  ONLINE = 'online',
  IN_GAME = 'in_game',
  OFFLINE = 'offline',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  telegramId: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: 1200 })
  elo: number;

  @Column({ default: 1200 })
  bestElo: number;

  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: 0 })
  draws: number;

  @Column({ default: 0 })
  puzzlesSolved: number;

  @Column({ default: 0 })
  puzzlesAttempted: number;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.OFFLINE,
  })
  status: UserStatus;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ nullable: true })
  bannedReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
