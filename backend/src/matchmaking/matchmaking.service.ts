import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { GamesService } from '../games/games.service';
import { UsersService } from '../users/users.service';
import { TimeControl } from '../shared/entities/game.entity';

interface QueueEntry {
  userId: string;
  elo: number;
  joinedAt: number;
  rangeExpanded: boolean;
}

@Injectable()
export class MatchmakingService implements OnModuleDestroy {
  private readonly logger = new Logger(MatchmakingService.name);
  private readonly redis: Redis;
  private readonly userQueues = new Map<string, TimeControl>();
  private matchmakingInterval: NodeJS.Timeout;
  private onMatchFoundCallback?: (
    white: string,
    black: string,
    gameId: string,
  ) => void;

  constructor(
    private readonly configService: ConfigService,
    private readonly gamesService: GamesService,
    private readonly usersService: UsersService,
  ) {
    const redisUrl = configService.get<string>('REDIS_URL');
    if (redisUrl) {
      const tlsOpts = redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {};
      this.redis = new Redis(redisUrl, tlsOpts);
    } else {
      this.redis = new Redis({
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
      });
    }
    this.matchmakingInterval = setInterval(
      () => this.processQueues(),
      2000,
    );
  }

  onModuleDestroy() {
    clearInterval(this.matchmakingInterval);
    this.redis.quit();
  }

  setOnMatchFound(
    cb: (white: string, black: string, gameId: string) => void,
  ) {
    this.onMatchFoundCallback = cb;
  }

  async joinQueue(userId: string, timeControl: TimeControl): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) return;

    await this.leaveQueue(userId);

    const key = `matchmaking:${timeControl}`;
    const entry: QueueEntry = {
      userId,
      elo: user.elo,
      joinedAt: Date.now(),
      rangeExpanded: false,
    };
    await this.redis.zadd(key, user.elo, JSON.stringify(entry));
    this.userQueues.set(userId, timeControl);
  }

  async leaveQueue(userId: string): Promise<void> {
    const tc = this.userQueues.get(userId);
    if (!tc) return;
    const key = `matchmaking:${tc}`;
    const members = await this.redis.zrange(key, 0, -1);
    for (const m of members) {
      const entry = JSON.parse(m) as QueueEntry;
      if (entry.userId === userId) {
        await this.redis.zrem(key, m);
        break;
      }
    }
    this.userQueues.delete(userId);
  }

  private async processQueues(): Promise<void> {
    const timeControls = Object.values(TimeControl);
    for (const tc of timeControls) {
      await this.processQueue(tc);
    }
  }

  private async processQueue(tc: TimeControl): Promise<void> {
    const key = `matchmaking:${tc}`;
    const members = await this.redis.zrange(key, 0, -1, 'WITHSCORES');

    if (members.length < 4) return;

    const entries: { entry: QueueEntry; score: number; raw: string }[] = [];
    for (let i = 0; i < members.length; i += 2) {
      entries.push({
        entry: JSON.parse(members[i]) as QueueEntry,
        score: parseFloat(members[i + 1]),
        raw: members[i],
      });
    }

    for (let i = 0; i < entries.length; i++) {
      const a = entries[i];
      const now = Date.now();
      const waitSec = (now - a.entry.joinedAt) / 1000;
      const range = waitSec > 30 ? 400 : 200;

      for (let j = i + 1; j < entries.length; j++) {
        const b = entries[j];
        if (Math.abs(a.entry.elo - b.entry.elo) <= range) {
          await this.createMatch(a, b, tc, key);
          return;
        }
      }
    }
  }

  private async createMatch(
    a: { entry: QueueEntry; raw: string },
    b: { entry: QueueEntry; raw: string },
    tc: TimeControl,
    key: string,
  ): Promise<void> {
    await this.redis.zrem(key, a.raw);
    await this.redis.zrem(key, b.raw);
    this.userQueues.delete(a.entry.userId);
    this.userQueues.delete(b.entry.userId);

    const isWhiteA = Math.random() > 0.5;
    const whiteId = isWhiteA ? a.entry.userId : b.entry.userId;
    const blackId = isWhiteA ? b.entry.userId : a.entry.userId;

    const game = await this.gamesService.createGame({ whiteId, blackId, timeControl: tc });

    if (this.onMatchFoundCallback) {
      this.onMatchFoundCallback(whiteId, blackId, game.id);
    }
  }
}
