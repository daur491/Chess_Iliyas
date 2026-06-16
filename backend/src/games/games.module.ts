import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../shared/entities/game.entity';
import { Move } from '../shared/entities/move.entity';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { GamesGateway } from './games.gateway';
import { TimersModule } from '../timers/timers.module';
import { BotModule } from '../bot/bot.module';
import { UsersModule } from '../users/users.module';
import { EloService } from '../shared/elo.service';
import { RatingModule } from '../rating/rating.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Move]),
    TimersModule,
    BotModule,
    UsersModule,
    RatingModule,
    AchievementsModule,
  ],
  providers: [GamesService, GamesGateway, EloService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}
