import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { GamesModule } from '../games/games.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [GamesModule, UsersModule],
  providers: [MatchmakingService],
  controllers: [MatchmakingController],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
