import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from '../shared/entities/achievement.entity';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { AchievementsListener } from './achievements.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Achievement])],
  providers: [AchievementsService, AchievementsListener],
  controllers: [AchievementsController],
  exports: [AchievementsService],
})
export class AchievementsModule {}
