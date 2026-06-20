import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { User } from '../shared/entities/user.entity';

const ELO_KEY = 'leaderboard:elo';
const PUZZLES_KEY = 'leaderboard:puzzles';

@Injectable()
export class RatingService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    const redisUrl = configService.get<string>('REDIS_URL');
    if (redisUrl) {
      const tlsOpts = redisUrl.startsWith('rediss://')
        ? { tls: { rejectUnauthorized: false } }
        : {};
      this.redis = new Redis(redisUrl, tlsOpts);
    } else {
      this.redis = new Redis({
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
      });
    }
  }

  onModuleDestroy() {
    this.redis.quit();
  }

  async updateLeaderboard(userId: string, elo: number): Promise<void> {
    await this.redis.zadd(ELO_KEY, elo, userId);
  }

  async updatePuzzleLeaderboard(userId: string, solved: number): Promise<void> {
    await this.redis.zadd(PUZZLES_KEY, solved, userId);
  }

  async getEloLeaderboard(
    currentUserId: string,
  ): Promise<{ top10: any[]; myPosition: number | null; context: any[] }> {
    const top10Ids = await this.redis.zrevrange(ELO_KEY, 0, 9, 'WITHSCORES');
    const top10 = await this.buildLeaderboardEntries(top10Ids, 1);

    const rank = await this.redis.zrevrank(ELO_KEY, currentUserId);
    const myPosition = rank !== null ? rank + 1 : null;

    let context: any[] = [];
    if (myPosition !== null && myPosition > 10) {
      const start = Math.max(0, myPosition - 3);
      const contextIds = await this.redis.zrevrange(
        ELO_KEY,
        start,
        start + 4,
        'WITHSCORES',
      );
      context = await this.buildLeaderboardEntries(contextIds, start + 1);
    }

    return { top10, myPosition, context };
  }

  async getPuzzleLeaderboard(
    currentUserId: string,
  ): Promise<{ top10: any[]; myPosition: number | null }> {
    const top10Ids = await this.redis.zrevrange(
      PUZZLES_KEY,
      0,
      9,
      'WITHSCORES',
    );
    const top10 = await this.buildLeaderboardEntries(top10Ids, 1, true);

    const rank = await this.redis.zrevrank(PUZZLES_KEY, currentUserId);
    const myPosition = rank !== null ? rank + 1 : null;

    return { top10, myPosition };
  }

  async seedLeaderboard(): Promise<void> {
    const users = await this.usersRepo.find({ order: { elo: 'DESC' } });
    const pipeline = this.redis.pipeline();
    for (const u of users) {
      pipeline.zadd(ELO_KEY, u.elo, u.id);
      pipeline.zadd(PUZZLES_KEY, u.puzzlesSolved, u.id);
    }
    await pipeline.exec();
  }

  private async buildLeaderboardEntries(
    idScores: string[],
    startRank: number,
    _isPuzzle = false,
  ): Promise<Record<string, unknown>[]> {
    const result: Record<string, unknown>[] = [];
    for (let i = 0; i < idScores.length; i += 2) {
      const userId = idScores[i];
      const score = parseInt(idScores[i + 1]);
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (user) {
        result.push({
          rank: startRank + i / 2,
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          elo: user.elo,
          puzzlesSolved: user.puzzlesSolved,
          score,
        });
      }
    }
    return result;
  }
}
