import { Controller, Get } from '@nestjs/common';
import { execSync } from 'child_process';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('stockfish')
  checkStockfish() {
    const paths = [
      '/usr/games/stockfish',
      '/usr/bin/stockfish',
      'stockfish',
    ];
    const results: Record<string, string> = {};
    for (const p of paths) {
      try {
        execSync(`test -f ${p} && echo exists`, { timeout: 1000 });
        results[p] = 'found';
      } catch {
        results[p] = 'not found';
      }
    }
    let version = 'unavailable';
    try {
      version = execSync('stockfish <<< "quit" 2>/dev/null | head -1 || echo "not found"', {
        timeout: 2000,
        shell: '/bin/bash',
      }).toString().trim();
    } catch { /* ignore */ }

    return {
      paths: results,
      version,
      STOCKFISH_PATH: process.env.STOCKFISH_PATH,
    };
  }
}
