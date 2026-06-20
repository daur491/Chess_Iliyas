import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GamesService } from './games.service';
import { BotService } from '../bot/bot.service';
import { TimerService } from '../timers/timer.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly gamesService: GamesService,
    private readonly botService: BotService,
    private readonly timerService: TimerService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.userSockets.delete(client.data.userId);
    }
  }

  @SubscribeMessage('join_game')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    await client.join(`game:${data.gameId}`);
    const { game, moves } = await this.gamesService.getGameWithMoves(data.gameId);

    // Initialize the server-side timer once per active game. This is idempotent:
    // if a timer already exists in Redis, ensureTimer leaves it untouched.
    if (game.status === 'active') {
      await this.ensureTimer(data.gameId, game.timeSeconds * 1000);
    }

    const timerState = await this.timerService.getTimerState(data.gameId);
    client.emit('game_state', { game, moves, timerState });
  }

  // Starts a persistent timer for the game if one isn't running yet, wiring the
  // timeout callback to finish the game and broadcast the result.
  async ensureTimer(gameId: string, timeMs: number): Promise<void> {
    const onTimeout = async (loser: 'white' | 'black') => {
      const game = await this.gamesService.finishOnTimeout(gameId, loser);
      this.server.to(`game:${gameId}`).emit('timeout', { loser });
      if (game) this.broadcastGameOver(gameId, game);
    };
    const onTick = (whiteMs: number, blackMs: number) => {
      this.server.to(`game:${gameId}`).emit('timer_update', { whiteMs, blackMs });
    };

    const existing = await this.timerService.getTimerState(gameId);
    if (existing) {
      // Redis state survives backend restarts but the in-memory interval and
      // callbacks don't — re-attach them so timeouts still fire.
      await this.timerService.resumeTimer(gameId, onTimeout, onTick);
      return;
    }

    // Start the clock on the side whose turn it is in the current position
    // (matters when the bot opened as white before the first join).
    let currentTurn: 'white' | 'black' = 'white';
    try {
      const { game } = await this.gamesService.getGameWithMoves(gameId);
      currentTurn = game.currentFen.split(' ')[1] === 'b' ? 'black' : 'white';
    } catch { /* default white */ }

    await this.timerService.initTimer(gameId, timeMs, onTimeout, onTick, currentTurn);
  }

  @SubscribeMessage('move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; move: string },
  ) {
    try {
      const userId = client.data.userId as string;
      const { game, move, isGameOver } = await this.gamesService.makeMove(
        data.gameId,
        userId,
        data.move,
      );

      await this.timerService.switchTurn(data.gameId);

      this.server.to(`game:${data.gameId}`).emit('move_made', {
        move,
        fen: game.currentFen,
        isGameOver,
        gameResult: isGameOver ? game.result : null,
        endReason: isGameOver ? game.endReason : null,
        whiteEloChange: isGameOver ? game.whiteEloChange : null,
        blackEloChange: isGameOver ? game.blackEloChange : null,
      });

      if (isGameOver) {
        await this.timerService.stopTimer(data.gameId);
        return;
      }

      if (game.isVsBot) {
        const botMove = await this.botService.getBotMove(
          game.currentFen,
          game.botLevel ?? 3,
        );
        if (botMove) {
          const botUserId = game.whiteId === userId ? game.blackId : game.whiteId;
          const { game: gameAfterBot, move: botMoveObj, isGameOver: botGameOver } =
            await this.gamesService.makeMove(data.gameId, botUserId ?? 'bot', botMove);

          await this.timerService.switchTurn(data.gameId);

          this.server.to(`game:${data.gameId}`).emit('move_made', {
            move: botMoveObj,
            fen: gameAfterBot.currentFen,
            isGameOver: botGameOver,
            gameResult: botGameOver ? gameAfterBot.result : null,
            endReason: botGameOver ? gameAfterBot.endReason : null,
            whiteEloChange: null,
            blackEloChange: null,
          });

          if (botGameOver) {
            await this.timerService.stopTimer(data.gameId);
          }
        }
      }
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('draw_offer')
  async handleDrawOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.userId as string;
    await this.gamesService.offerDraw(data.gameId, userId);
    this.server.to(`game:${data.gameId}`).emit('draw_offered', { by: userId });
  }

  @SubscribeMessage('draw_accept')
  async handleDrawAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const game = await this.gamesService.acceptDraw(data.gameId);
    await this.timerService.stopTimer(data.gameId);
    this.server.to(`game:${data.gameId}`).emit('game_over', {
      result: game.result,
      endReason: game.endReason,
      whiteEloChange: game.whiteEloChange,
      blackEloChange: game.blackEloChange,
    });
  }

  @SubscribeMessage('resign')
  async handleResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.userId as string;
    const game = await this.gamesService.resign(data.gameId, userId);
    await this.timerService.stopTimer(data.gameId);
    this.server.to(`game:${data.gameId}`).emit('game_over', {
      result: game.result,
      endReason: game.endReason,
      whiteEloChange: game.whiteEloChange,
      blackEloChange: game.blackEloChange,
    });
  }

  broadcastMoveMade(
    gameId: string,
    move: any,
    game: any,
    isGameOver: boolean,
  ): void {
    this.server.to(`game:${gameId}`).emit('move_made', {
      move,
      fen: game.currentFen,
      isGameOver,
      gameResult: isGameOver ? game.result : null,
      endReason: isGameOver ? game.endReason : null,
      whiteEloChange: isGameOver ? game.whiteEloChange : null,
      blackEloChange: isGameOver ? game.blackEloChange : null,
    });
  }

  broadcastGameOver(gameId: string, game: any): void {
    this.server.to(`game:${gameId}`).emit('game_over', {
      result: game.result,
      endReason: game.endReason,
      whiteEloChange: game.whiteEloChange,
      blackEloChange: game.blackEloChange,
    });
  }

  emitMatchFound(userId: string, gameId: string, color: 'white' | 'black') {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('match_found', { gameId, color });
    }
  }

  emitTimerUpdate(gameId: string, whiteMs: number, blackMs: number) {
    this.server.to(`game:${gameId}`).emit('timer_update', { whiteMs, blackMs });
  }

  emitTimeout(gameId: string, loser: 'white' | 'black') {
    this.server.to(`game:${gameId}`).emit('timeout', { loser });
  }
}
