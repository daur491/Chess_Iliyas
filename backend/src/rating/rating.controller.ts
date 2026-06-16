import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { User } from '../shared/entities/user.entity';
import { RatingService } from './rating.service';

@Controller('rating')
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Get('leaderboard')
  getEloLeaderboard(@CurrentUser() user: User) {
    return this.ratingService.getEloLeaderboard(user.id);
  }

  @Get('leaderboard/puzzles')
  getPuzzleLeaderboard(@CurrentUser() user: User) {
    return this.ratingService.getPuzzleLeaderboard(user.id);
  }
}
