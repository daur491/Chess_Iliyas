import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface BotConfig {
  depth: number;
  skillLevel: number; // Stockfish Skill Level 0-20
  uciElo: number; // Stockfish UCI_Elo (1320-3190)
  limitStrength: boolean;
  movetime?: number; // max ms per move (дополнительное ограничение для слабых уровней)
}

const BOT_CONFIG: Record<number, BotConfig> = {
  1: {
    depth: 1,
    skillLevel: 0,
    uciElo: 800,
    limitStrength: true,
    movetime: 100,
  },
  2: {
    depth: 3,
    skillLevel: 5,
    uciElo: 1100,
    limitStrength: true,
    movetime: 300,
  },
  3: {
    depth: 6,
    skillLevel: 10,
    uciElo: 1500,
    limitStrength: true,
    movetime: 1000,
  },
  4: {
    depth: 10,
    skillLevel: 16,
    uciElo: 1800,
    limitStrength: true,
    movetime: 2000,
  },
  5: { depth: 18, skillLevel: 20, uciElo: 2200, limitStrength: false },
};

@Injectable()
export class BotService implements OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private stockfishPath: string;
  private stockfishAvailable: boolean | null = null;

  constructor(private readonly configService: ConfigService) {
    const configured = configService.get<string>('STOCKFISH_PATH', 'stockfish');
    // Resolve relative paths from the app root directory
    if (configured.startsWith('./') || configured.startsWith('../')) {
      const resolved = path.resolve(process.cwd(), configured);
      this.stockfishPath = fs.existsSync(resolved) ? resolved : configured;
    } else {
      this.stockfishPath = configured;
    }
    this.logger.log(`Stockfish path: ${this.stockfishPath}`);
  }

  onModuleDestroy() {}

  getBotMove(fen: string, level: number): Promise<string | null> {
    return new Promise((resolve) => {
      const config = BOT_CONFIG[level] ?? BOT_CONFIG[3];

      const sfProcess = spawn(this.stockfishPath);
      let resolved = false;

      const safeResolve = (val: string | null) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      sfProcess.on('error', (err) => {
        this.logger.warn(`Stockfish unavailable: ${err.message}`);
        this.stockfishAvailable = false;
        safeResolve(null);
      });

      const timeoutMs = (config.movetime ?? 5000) + 3000;
      const timeout = setTimeout(() => {
        sfProcess.kill();
        safeResolve(null);
      }, timeoutMs);

      let output = '';

      sfProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('bestmove')) {
          clearTimeout(timeout);
          const match = output.match(/bestmove\s+(\S+)/);
          sfProcess.kill();
          this.stockfishAvailable = true;
          safeResolve(match ? this.uciToSan(match[1], fen) : null);
        }
      });

      // Настраиваем Stockfish через UCI перед отправкой позиции
      sfProcess.stdin?.write('uci\n');
      sfProcess.stdin?.write(
        `setoption name Skill Level value ${config.skillLevel}\n`,
      );
      if (config.limitStrength) {
        sfProcess.stdin?.write('setoption name UCI_LimitStrength value true\n');
        sfProcess.stdin?.write(
          `setoption name UCI_Elo value ${config.uciElo}\n`,
        );
      } else {
        sfProcess.stdin?.write(
          'setoption name UCI_LimitStrength value false\n',
        );
      }
      sfProcess.stdin?.write('isready\n');
      sfProcess.stdin?.write(`position fen ${fen}\n`);

      if (config.movetime) {
        sfProcess.stdin?.write(
          `go depth ${config.depth} movetime ${config.movetime}\n`,
        );
      } else {
        sfProcess.stdin?.write(`go depth ${config.depth}\n`);
      }
    });
  }

  private uciToSan(uci: string, _fen: string): string {
    return uci;
  }

  async analyzePosition(
    fen: string,
    depth = 20,
  ): Promise<{ score: number; bestMove: string; lines: string[] }> {
    return new Promise((resolve) => {
      const sfProcess = spawn(this.stockfishPath);
      let resolved = false;

      const safeResolve = (val: {
        score: number;
        bestMove: string;
        lines: string[];
      }) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      sfProcess.on('error', (err) => {
        this.logger.warn(`Stockfish unavailable for analysis: ${err.message}`);
        safeResolve({ score: 0, bestMove: '', lines: [] });
      });

      const timeout = setTimeout(() => {
        sfProcess.kill();
        safeResolve({ score: 0, bestMove: '', lines: [] });
      }, 10000);

      let output = '';

      sfProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('bestmove')) {
          clearTimeout(timeout);
          sfProcess.kill();
          const scoreMatch = output.match(/score cp (-?\d+)/);
          const bestMoveMatch = output.match(/bestmove\s+(\S+)/);
          safeResolve({
            score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
            bestMove: bestMoveMatch ? bestMoveMatch[1] : '',
            lines: [],
          });
        }
      });

      sfProcess.stdin?.write('uci\n');
      sfProcess.stdin?.write('setoption name UCI_LimitStrength value false\n');
      sfProcess.stdin?.write('isready\n');
      sfProcess.stdin?.write(`position fen ${fen}\n`);
      sfProcess.stdin?.write(`go depth ${depth}\n`);
    });
  }

  isAvailable(): boolean {
    return this.stockfishAvailable !== false;
  }
}
