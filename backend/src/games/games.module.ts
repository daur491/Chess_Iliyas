import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'default-secret'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
    TimersModule,
    BotModule,
    UsersModule,
    RatingModule,
    AchievementsModule,
  ],
  providers: [GamesService, GamesGateway, EloService],
  controllers: [GamesController],
  exports: [GamesService, GamesGateway],
})
export class GamesModule {}
