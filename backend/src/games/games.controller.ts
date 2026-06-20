import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { User } from '../shared/entities/user.entity';
import { GamesService } from './games.service';
import { GamesGateway } from './games.gateway';
import { BotService } from '../bot/bot.service';
import { TimerService } from '../timers/timer.service';
import { TimeControl } from '../shared/entities/game.entity';

class CreateBotGameDto {
  @IsEnum(TimeControl)
  timeControl: TimeControl;

  @IsInt()
  @Min(1)
  @Max(5)
  botLevel: number;

  @IsOptional()
  color?: 'white' | 'black' | 'random';
}

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly gamesGateway: GamesGateway,
    private readonly botService: BotService,
    private readonly timerService: TimerService,
  ) {}

  @Post('vs-bot')
  async createBotGame(
    @CurrentUser() user: User,
    @Body() dto: CreateBotGameDto,
  ) {
    const color =
      dto.color === 'random'
        ? Math.random() > 0.5 ? 'white' : 'black'
        : (dto.color ?? 'white');

    // Close any lingering active games so the user has at most one ongoing game.
    await this.gamesService.abandonActiveGames(user.id);

    const game = await this.gamesService.createGame({
      whiteId: color === 'white' ? user.id : undefined,
      blackId: color === 'black' ? user.id : undefined,
      timeControl: dto.timeControl,
      isVsBot: true,
      botLevel: dto.botLevel,
    });

    // If bot plays white — make its opening move immediately
    if (color === 'black') {
      const botMove = await this.botService.getBotMove(
        game.currentFen,
        dto.botLevel,
      );
      if (botMove) {
        try {
          await this.gamesService.makeMove(game.id, '__bot__', botMove);
          return this.gamesService.getGameWithMoves(game.id).then(r => r.game);
        } catch { /* return game as-is on error */ }
      }
    }

    return game;
  }

  @Get('active')
  getActive(@CurrentUser() user: User) {
    return this.gamesService.getActiveGames(user.id);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.gamesService.getGameHistory(user.id, +page, +limit);
  }

  @Get(':id')
  getGame(@Param('id') id: string) {
    return this.gamesService.getGameWithMoves(id);
  }

  @Get(':id/pgn')
  async getPgn(@Param('id') id: string) {
    const { game } = await this.gamesService.getGameWithMoves(id);
    return { pgn: game.pgn };
  }

  @Post(':id/move')
  async makeMove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: { move: string },
  ) {
    const result = await this.gamesService.makeMove(id, user.id, dto.move);

    // Ensure a server-side timer exists (covers the case where the move arrives
    // before a socket join initialized it). Idempotent.
    await this.gamesGateway.ensureTimer(id, result.game.timeSeconds * 1000);

    if (!result.game.isVsBot) {
      // PvP: broadcast via WebSocket so opponent sees the move immediately
      await this.timerService.switchTurn(id);
      this.gamesGateway.broadcastMoveMade(id, result.move, result.game, result.isGameOver);
      if (result.isGameOver) {
        await this.timerService.stopTimer(id);
      }
      return result;
    }

    // vs bot: the player just moved, so the clock switches to the bot's side.
    if (result.isGameOver) {
      await this.timerService.stopTimer(id);
      return result;
    }
    await this.timerService.switchTurn(id);

    // Make the bot move immediately, then switch the clock back to the player.
    const botMove = await this.botService.getBotMove(
      result.game.currentFen,
      result.game.botLevel ?? 3,
    );
    if (botMove) {
      try {
        const botResult = await this.gamesService.makeMove(
          id,
          '__bot__',
          botMove,
        );
        if (botResult.isGameOver) {
          await this.timerService.stopTimer(id);
        } else {
          await this.timerService.switchTurn(id);
        }
        return {
          game: botResult.game,
          playerMove: result.move,
          playerFen: result.game.currentFen,
          botMove: botResult.move,
          isGameOver: botResult.isGameOver,
        };
      } catch {
        // Bot move failed — return player move result
      }
    }

    return result;
  }

  @Post(':id/resign')
  async resign(@Param('id') id: string, @CurrentUser() user: User) {
    const game = await this.gamesService.resign(id, user.id);
    // PvP: notify the opponent immediately that the game is over.
    if (!game.isVsBot) {
      await this.timerService.stopTimer(id);
      this.gamesGateway.broadcastGameOver(id, game);
    }
    return game;
  }
}
