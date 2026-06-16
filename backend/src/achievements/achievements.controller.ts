import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { User } from '../shared/entities/user.entity';
import { AchievementsService } from './achievements.service';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  getAll(@CurrentUser() user: User) {
    return this.achievementsService.getUserAchievements(user.id);
  }

  @Get('recent')
  getRecent(@CurrentUser() user: User) {
    return this.achievementsService.getRecentUnlocked(user.id);
  }
}
