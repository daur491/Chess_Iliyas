import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcess } from 'child_process';

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

  constructor(private readonly configService: ConfigService) {
    this.stockfishPath = configService.get<string>(
      'STOCKFISH_PATH',
      'stockfish',
    );
  }

  onModuleDestroy() {}

  getBotMove(fen: string, level: number): Promise<string | null> {
    return new Promise((resolve) => {
      const depth = DEPTH_BY_LEVEL[level] ?? 8;
      let process: ChildProcess;

      try {
        process = spawn(this.stockfishPath);
      } catch {
        this.logger.warn('Stockfish not found, returning null');
        resolve(null);
        return;
      }

      let output = '';
      const timeout = setTimeout(() => {
        process.kill();
        resolve(null);
      }, 5000);

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('bestmove')) {
          clearTimeout(timeout);
          const match = output.match(/bestmove\s+(\S+)/);
          process.kill();
          if (match) {
            resolve(this.uciToSan(match[1], fen));
          } else {
            resolve(null);
          }
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

  async analyzePosition(fen: string, depth = 20): Promise<{
    score: number;
    bestMove: string;
    lines: string[];
  }> {
    return new Promise((resolve) => {
      let process: ChildProcess;

      try {
        process = spawn(this.stockfishPath);
      } catch {
        resolve({ score: 0, bestMove: '', lines: [] });
        return;
      }

      let output = '';
      const timeout = setTimeout(() => {
        process.kill();
        resolve({ score: 0, bestMove: '', lines: [] });
      }, 10000);

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('bestmove')) {
          clearTimeout(timeout);
          process.kill();
          const scoreMatch = output.match(/score cp (-?\d+)/);
          const bestMoveMatch = output.match(/bestmove\s+(\S+)/);
          resolve({
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
}
