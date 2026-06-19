import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface TimerState {
  whiteMs: number;
  blackMs: number;
  currentTurn: 'white' | 'black';
  lastMoveAt: number;
  running: boolean;
}

@Injectable()
export class TimerService implements OnModuleDestroy {
  private readonly redis: Redis;
  private intervals = new Map<string, NodeJS.Timeout>();
  private onTimeoutCallbacks = new Map<string, (loser: 'white' | 'black') => void>();
  private onTickCallbacks = new Map<string, (whiteMs: number, blackMs: number) => void>();

  constructor(private readonly configService: ConfigService) {
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
  }

  onModuleDestroy() {
    this.redis.quit();
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
  }

  async initTimer(
    gameId: string,
    timeMs: number,
    onTimeout: (loser: 'white' | 'black') => void,
    onTick?: (whiteMs: number, blackMs: number) => void,
  ): Promise<void> {
    const state: TimerState = {
      whiteMs: timeMs,
      blackMs: timeMs,
      currentTurn: 'white',
      lastMoveAt: Date.now(),
      running: true,
    };
    await this.redis.set(`game:${gameId}:timer`, JSON.stringify(state));
    this.onTimeoutCallbacks.set(gameId, onTimeout);
    if (onTick) this.onTickCallbacks.set(gameId, onTick);
    this.startInterval(gameId);
  }

  async getTimerState(gameId: string): Promise<TimerState | null> {
    const raw = await this.redis.get(`game:${gameId}:timer`);
    if (!raw) return null;
    return JSON.parse(raw) as TimerState;
  }

  async switchTurn(gameId: string): Promise<void> {
    const state = await this.getTimerState(gameId);
    if (!state) return;

    const now = Date.now();
    const elapsed = now - state.lastMoveAt;

    if (state.currentTurn === 'white') {
      state.whiteMs = Math.max(0, state.whiteMs - elapsed);
      state.currentTurn = 'black';
    } else {
      state.blackMs = Math.max(0, state.blackMs - elapsed);
      state.currentTurn = 'white';
    }
    state.lastMoveAt = now;

    await this.redis.set(`game:${gameId}:timer`, JSON.stringify(state));
  }

  async stopTimer(gameId: string): Promise<void> {
    const interval = this.intervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(gameId);
    }
    await this.redis.del(`game:${gameId}:timer`);
    this.onTimeoutCallbacks.delete(gameId);
    this.onTickCallbacks.delete(gameId);
  }

  private startInterval(gameId: string): void {
    const interval = setInterval(async () => {
      const state = await this.getTimerState(gameId);
      if (!state || !state.running) {
        clearInterval(interval);
        this.intervals.delete(gameId);
        return;
      }

      const now = Date.now();
      const elapsed = now - state.lastMoveAt;

      // Remaining time for each side, accounting for the live elapsed time of
      // the side currently on the move.
      const liveWhite =
        state.currentTurn === 'white'
          ? Math.max(0, state.whiteMs - elapsed)
          : state.whiteMs;
      const liveBlack =
        state.currentTurn === 'black'
          ? Math.max(0, state.blackMs - elapsed)
          : state.blackMs;

      const tickCb = this.onTickCallbacks.get(gameId);
      if (tickCb) tickCb(liveWhite, liveBlack);

      const currentMs =
        state.currentTurn === 'white' ? state.whiteMs : state.blackMs;

      if (currentMs - elapsed <= 0) {
        const loser = state.currentTurn;
        await this.stopTimer(gameId);
        const cb = this.onTimeoutCallbacks.get(gameId);
        if (cb) cb(loser);
      }
    }, 1000);

    this.intervals.set(gameId, interval);
  }
}
