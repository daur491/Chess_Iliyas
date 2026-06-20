import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../shared/entities/user.entity';

interface FindOrCreateDto {
  telegramId: string;
  username: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findOrCreate(dto: FindOrCreateDto): Promise<User> {
    let user = await this.usersRepo.findOne({
      where: { telegramId: dto.telegramId },
    });

    if (!user) {
      user = this.usersRepo.create({
        telegramId: dto.telegramId,
        username: dto.username,
        avatarUrl: dto.avatarUrl,
        status: UserStatus.ONLINE,
      });
      await this.usersRepo.save(user);
    } else {
      user.username = dto.username;
      if (dto.avatarUrl) user.avatarUrl = dto.avatarUrl;
      user.status = UserStatus.ONLINE;
      await this.usersRepo.save(user);
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { telegramId } });
  }

  async updateStatus(id: string, status: UserStatus): Promise<void> {
    await this.usersRepo.update(id, { status });
  }

  async updateElo(
    id: string,
    newElo: number,
    _eloChange: number,
  ): Promise<void> {
    const user = await this.findById(id);
    if (!user) return;
    user.elo = newElo;
    if (newElo > user.bestElo) user.bestElo = newElo;
    await this.usersRepo.save(user);
  }

  async incrementGameStats(
    id: string,
    result: 'win' | 'loss' | 'draw',
  ): Promise<void> {
    await this.usersRepo.increment({ id }, 'gamesPlayed', 1);
    if (result === 'win') await this.usersRepo.increment({ id }, 'wins', 1);
    else if (result === 'loss')
      await this.usersRepo.increment({ id }, 'losses', 1);
    else await this.usersRepo.increment({ id }, 'draws', 1);
  }

  async incrementPuzzleSolved(id: string): Promise<void> {
    await this.usersRepo.increment({ id }, 'puzzlesSolved', 1);
    await this.usersRepo.increment({ id }, 'puzzlesAttempted', 1);
  }

  async incrementPuzzleAttempted(id: string): Promise<void> {
    await this.usersRepo.increment({ id }, 'puzzlesAttempted', 1);
  }

  async findAll(page = 1, limit = 20): Promise<[User[], number]> {
    return this.usersRepo.findAndCount({
      order: { elo: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async banUser(id: string, reason: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isBanned = true;
    user.bannedReason = reason;
    return this.usersRepo.save(user);
  }

  async updateUserEloAdmin(id: string, elo: number): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.elo = elo;
    if (elo > user.bestElo) user.bestElo = elo;
    return this.usersRepo.save(user);
  }
}
