import { Controller, Get } from '@nestjs/common';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('stockfish')
  checkStockfish() {
    const configured = process.env.STOCKFISH_PATH ?? 'stockfish';
    const resolved =
      configured.startsWith('./') || configured.startsWith('../')
        ? resolve(process.cwd(), configured)
        : configured;

    const checkPaths = [
      resolved,
      '/usr/games/stockfish',
      '/usr/bin/stockfish',
      resolve(process.cwd(), 'bin/stockfish'),
    ];

    const results: Record<string, string> = {};
    for (const p of checkPaths) {
      results[p] = existsSync(p) ? 'EXISTS' : 'missing';
    }

    let version = 'unavailable';
    try {
      version = execSync(`"${resolved}" <<< "quit" 2>/dev/null | head -1`, {
        timeout: 2000,
        shell: '/bin/bash',
      })
        .toString()
        .trim();
    } catch {
      /* ignore */
    }

    return {
      configured,
      resolved,
      paths: results,
      version,
      cwd: process.cwd(),
    };
  }
}
