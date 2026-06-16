import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { PuzzlesModule } from '../puzzles/puzzles.module';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [UsersModule, PuzzlesModule, TournamentsModule],
  controllers: [AdminController],
})
export class AdminModule {}
