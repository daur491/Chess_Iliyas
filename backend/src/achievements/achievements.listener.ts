import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AchievementsService } from './achievements.service';
import { AchievementType } from '../shared/entities/achievement.entity';
import { Game, GameResult } from '../shared/entities/game.entity';

@Injectable()
export class AchievementsListener {
  constructor(private readonly achievementsService: AchievementsService) {}

  @OnEvent('game.finished')
  async handleGameFinished(game: Game) {
    if (game.isVsBot) return;
    if (!game.whiteId || !game.blackId) return;

    const isWhiteWin = game.result === GameResult.WHITE_WIN;
    const isBlackWin = game.result === GameResult.BLACK_WIN;
    const isDraw = game.result === GameResult.DRAW;

    if (isWhiteWin) {
      await this.achievementsService.checkAndUnlock(game.whiteId, AchievementType.FIRST_WIN, 1);
    }
    if (isBlackWin) {
      await this.achievementsService.checkAndUnlock(game.blackId, AchievementType.FIRST_WIN, 1);
    }
    if (isDraw) {
      await this.achievementsService.checkAndUnlock(game.whiteId, AchievementType.FIRST_DRAW, 1);
      await this.achievementsService.checkAndUnlock(game.blackId, AchievementType.FIRST_DRAW, 1);
    }
  }

  @OnEvent('puzzle.solved')
  async handlePuzzleSolved(payload: { userId: string; totalSolved: number; firstTry: boolean }) {
    const { userId, totalSolved, firstTry } = payload;

    await this.achievementsService.checkAndUnlock(userId, AchievementType.PUZZLES_10, totalSolved);
    await this.achievementsService.checkAndUnlock(userId, AchievementType.PUZZLES_50, totalSolved);
    await this.achievementsService.checkAndUnlock(userId, AchievementType.PUZZLES_100, totalSolved);

    if (firstTry) {
      await this.achievementsService.checkAndUnlock(userId, AchievementType.PUZZLE_PERFECT, 1);
    }
  }

  @OnEvent('user.elo_updated')
  async handleEloUpdated(payload: { userId: string; newElo: number }) {
    const { userId, newElo } = payload;
    await this.achievementsService.checkAndUnlock(userId, AchievementType.ELO_1400, newElo);
    await this.achievementsService.checkAndUnlock(userId, AchievementType.ELO_1500, newElo);
    await this.achievementsService.checkAndUnlock(userId, AchievementType.ELO_1700, newElo);
    await this.achievementsService.checkAndUnlock(userId, AchievementType.ELO_2000, newElo);
  }

  @OnEvent('tournament.joined')
  async handleTournamentJoined(payload: { userId: string }) {
    await this.achievementsService.checkAndUnlock(
      payload.userId,
      AchievementType.TOURNAMENT_PARTICIPATE,
      1,
    );
  }

  @OnEvent('tournament.won')
  async handleTournamentWon(payload: { userId: string }) {
    await this.achievementsService.checkAndUnlock(
      payload.userId,
      AchievementType.TOURNAMENT_WIN,
      1,
    );
  }
}
