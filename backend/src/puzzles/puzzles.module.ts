import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Puzzle } from '../shared/entities/puzzle.entity';
import { PuzzleAttempt } from '../shared/entities/puzzle-attempt.entity';
import { PuzzlesService } from './puzzles.service';
import { PuzzlesController } from './puzzles.controller';
import { UsersModule } from '../users/users.module';
import { RatingModule } from '../rating/rating.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Puzzle, PuzzleAttempt]),
    UsersModule,
    RatingModule,
  ],
  providers: [PuzzlesService],
  controllers: [PuzzlesController],
  exports: [PuzzlesService],
})
export class PuzzlesModule {}
