import { Module, OnModuleInit } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { GamesModule } from '../games/games.module';
import { GamesGateway } from '../games/games.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [GamesModule, UsersModule],
  providers: [MatchmakingService],
  controllers: [MatchmakingController],
  exports: [MatchmakingService],
})
export class MatchmakingModule implements OnModuleInit {
  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly gamesGateway: GamesGateway,
  ) {}

  onModuleInit() {
    this.matchmakingService.setOnMatchFound(
      (white: string, black: string, gameId: string) => {
        this.gamesGateway.emitMatchFound(white, gameId, 'white');
        this.gamesGateway.emitMatchFound(black, gameId, 'black');
      },
    );
  }
}
