import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { TimersModule } from './timers/timers.module';
import { BotModule } from './bot/bot.module';
import { PuzzlesModule } from './puzzles/puzzles.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { AchievementsModule } from './achievements/achievements.module';
import { RatingModule } from './rating/rating.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';
import { User } from './shared/entities/user.entity';
import { Game } from './shared/entities/game.entity';
import { Move } from './shared/entities/move.entity';
import { Puzzle } from './shared/entities/puzzle.entity';
import { PuzzleAttempt } from './shared/entities/puzzle-attempt.entity';
import { Achievement } from './shared/entities/achievement.entity';
import { Tournament } from './shared/entities/tournament.entity';
import { TournamentParticipant } from './shared/entities/tournament-participant.entity';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [
              User, Game, Move, Puzzle, PuzzleAttempt,
              Achievement, Tournament, TournamentParticipant,
            ],
            synchronize: config.get('DB_SYNCHRONIZE', 'true') !== 'false',
            ssl: { rejectUnauthorized: false },
          };
        }
        return {
          type: 'postgres',
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get('DB_USER', 'chess_user'),
          password: config.get('DB_PASSWORD', 'chess_password'),
          database: config.get('DB_NAME', 'chess_db'),
          entities: [
            User, Game, Move, Puzzle, PuzzleAttempt,
            Achievement, Tournament, TournamentParticipant,
          ],
          synchronize: config.get('NODE_ENV') !== 'production',
          logging: config.get('NODE_ENV') === 'development',
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return { redis: redisUrl };
        }
        return {
          redis: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    GamesModule,
    MatchmakingModule,
    TimersModule,
    BotModule,
    PuzzlesModule,
    TournamentsModule,
    AchievementsModule,
    RatingModule,
    AdminModule,
  ],
})
export class AppModule {}
