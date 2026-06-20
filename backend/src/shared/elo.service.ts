import { Injectable } from '@nestjs/common';

@Injectable()
export class EloService {
  private getKFactor(elo: number, gamesPlayed: number): number {
    if (gamesPlayed < 30) return 40;
    if (elo >= 2400) return 10;
    return 20;
  }

  calculate(
    whiteElo: number,
    blackElo: number,
    result: 'white' | 'black' | 'draw',
    whiteGames: number,
    blackGames: number,
  ): {
    whiteNew: number;
    blackNew: number;
    whiteChange: number;
    blackChange: number;
  } {
    const expectedWhite = 1 / (1 + Math.pow(10, (blackElo - whiteElo) / 400));
    const expectedBlack = 1 - expectedWhite;

    const scoreWhite = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0;
    const scoreBlack = 1 - scoreWhite;

    const kWhite = this.getKFactor(whiteElo, whiteGames);
    const kBlack = this.getKFactor(blackElo, blackGames);

    const whiteChange = Math.round(kWhite * (scoreWhite - expectedWhite));
    const blackChange = Math.round(kBlack * (scoreBlack - expectedBlack));

    return {
      whiteNew: Math.max(100, whiteElo + whiteChange),
      blackNew: Math.max(100, blackElo + blackChange),
      whiteChange,
      blackChange,
    };
  }
}
