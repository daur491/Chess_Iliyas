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
  constructor(private readonly gamesService: GamesService) {}

  @Post('vs-bot')
  async createBotGame(
    @CurrentUser() user: User,
    @Body() dto: CreateBotGameDto,
  ) {
    const color =
      dto.color === 'random'
        ? Math.random() > 0.5 ? 'white' : 'black'
        : (dto.color ?? 'white');

    return this.gamesService.createGame({
      whiteId: color === 'white' ? user.id : undefined,
      blackId: color === 'black' ? user.id : undefined,
      timeControl: dto.timeControl,
      isVsBot: true,
      botLevel: dto.botLevel,
    });
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
}
