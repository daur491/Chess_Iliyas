import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from '../shared/entities/tournament.entity';
import { TournamentParticipant } from '../shared/entities/tournament-participant.entity';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { UsersModule } from '../users/users.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, TournamentParticipant]),
    UsersModule,
    GamesModule,
  ],
  providers: [TournamentsService],
  controllers: [TournamentsController],
  exports: [TournamentsService],
})
export class TournamentsModule {}
