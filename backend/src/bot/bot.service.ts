import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const DEPTH_BY_LEVEL: Record<number, number> = {
  1: 2,
  2: 5,
  3: 8,
  4: 12,
  5: 20,
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
      const depth = DEPTH_BY_LEVEL[level] ?? 8;

      const process = spawn(this.stockfishPath);
      let resolved = false;

      const safeResolve = (val: string | null) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      process.on('error', (err) => {
        this.logger.warn(`Stockfish unavailable: ${err.message}`);
        this.stockfishAvailable = false;
        safeResolve(null);
      });

      const timeout = setTimeout(() => {
        process.kill();
        safeResolve(null);
      }, 5000);

      let output = '';

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('bestmove')) {
          clearTimeout(timeout);
          const match = output.match(/bestmove\s+(\S+)/);
          process.kill();
          this.stockfishAvailable = true;
          safeResolve(match ? this.uciToSan(match[1], fen) : null);
        }
      });

      process.stdin?.write('uci\n');
      process.stdin?.write(`position fen ${fen}\n`);
      process.stdin?.write(`go depth ${depth}\n`);
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
      const process = spawn(this.stockfishPath);
      let resolved = false;

      const safeResolve = (val: { score: number; bestMove: string; lines: string[] }) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      process.on('error', (err) => {
        this.logger.warn(`Stockfish unavailable for analysis: ${err.message}`);
        safeResolve({ score: 0, bestMove: '', lines: [] });
      });

      const timeout = setTimeout(() => {
        process.kill();
        safeResolve({ score: 0, bestMove: '', lines: [] });
      }, 10000);

      let output = '';

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('bestmove')) {
          clearTimeout(timeout);
          process.kill();
          const scoreMatch = output.match(/score cp (-?\d+)/);
          const bestMoveMatch = output.match(/bestmove\s+(\S+)/);
          safeResolve({
            score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
            bestMove: bestMoveMatch ? bestMoveMatch[1] : '',
            lines: [],
          });
        }
      });

      process.stdin?.write('uci\n');
      process.stdin?.write(`position fen ${fen}\n`);
      process.stdin?.write(`go depth ${depth}\n`);
    });
  }

  isAvailable(): boolean {
    return this.stockfishAvailable !== false;
  }
}
