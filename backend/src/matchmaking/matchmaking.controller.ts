import { Controller, Post, Delete, Get, Body, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { User } from '../shared/entities/user.entity';
import { MatchmakingService } from './matchmaking.service';
import { TimeControl } from '../shared/entities/game.entity';

class JoinQueueDto {
  @IsEnum(TimeControl)
  timeControl: TimeControl;
}

@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('join')
  async join(@CurrentUser() user: User, @Body() dto: JoinQueueDto) {
    await this.matchmakingService.joinQueue(user.id, dto.timeControl);
    return { status: 'queued', timeControl: dto.timeControl };
  }

  @Delete('leave')
  async leave(@CurrentUser() user: User) {
    await this.matchmakingService.leaveQueue(user.id);
    return { status: 'left' };
  }

  @Get('status')
  async status(@CurrentUser() user: User) {
    const result = await this.matchmakingService.getMatchStatus(user.id);
    return result;
  }
}
