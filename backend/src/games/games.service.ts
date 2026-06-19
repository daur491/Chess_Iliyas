import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Chess } from 'chess.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Game, GameStatus, GameResult, GameEndReason, TimeControl } from '../shared/entities/game.entity';
import { Move } from '../shared/entities/move.entity';
import { EloService } from '../shared/elo.service';
import { UsersService } from '../users/users.service';
import { RatingService } from '../rating/rating.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gamesRepo: Repository<Game>,
    @InjectRepository(Move)
    private readonly movesRepo: Repository<Move>,
    private readonly eloService: EloService,
    private readonly usersService: UsersService,
    private readonly ratingService: RatingService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createGame(params: {
    whiteId?: string;
    blackId?: string;
    timeControl: TimeControl;
    isVsBot?: boolean;
    botLevel?: number;
  }): Promise<Game> {
    const timeSeconds = this.getTimeSeconds(params.timeControl);
    const game = this.gamesRepo.create({
      whiteId: params.whiteId,
      blackId: params.blackId,
      timeControl: params.timeControl,
      timeSeconds,
      isVsBot: params.isVsBot ?? false,
      botLevel: params.botLevel,
      status: GameStatus.ACTIVE,
    });
    return this.gamesRepo.save(game);
  }

  async makeMove(gameId: string, playerId: string, moveSan: string): Promise<{
    game: Game;
    move: Move;
    isGameOver: boolean;
  }> {
    const game = await this.gamesRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');
    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game is not active');
    }

    const chess = new Chess(game.currentFen);
    const isWhiteTurn = chess.turn() === 'w';
    const expectedPlayerId = isWhiteTurn ? game.whiteId : game.blackId;

    // In vs-bot games, bot moves have no userId (blackId/whiteId is null)
    const isBotTurn = game.isVsBot && expectedPlayerId === null;
    if (!isBotTurn && playerId !== expectedPlayerId) {
      throw new BadRequestException('Not your turn');
    }

    let moveResult;
    try {
      moveResult = chess.move(moveSan);
    } catch {
      throw new BadRequestException('Invalid move');
    }

    game.currentFen = chess.fen();
    const moves = await this.movesRepo.count({ where: { gameId } });

    const move = this.movesRepo.create({
      gameId,
      playerId,
      moveSan: moveResult.san,
      moveUci: moveResult.from + moveResult.to + (moveResult.promotion ?? ''),
      fenAfter: chess.fen(),
      moveNumber: Math.floor(moves / 2) + 1,
    });
    await this.movesRepo.save(move);

    let isGameOver = false;
    if (chess.isGameOver()) {
      isGameOver = true;
      await this.finishGame(game, chess);
    } else {
      await this.gamesRepo.save(game);
    }

    return { game, move, isGameOver };
  }

  async finishGame(game: Game, chess: Chess, reason?: GameEndReason): Promise<Game> {
    if (chess.isCheckmate()) {
      game.result = chess.turn() === 'w' ? GameResult.BLACK_WIN : GameResult.WHITE_WIN;
      game.endReason = GameEndReason.CHECKMATE;
    } else if (chess.isStalemate()) {
      game.result = GameResult.DRAW;
      game.endReason = GameEndReason.STALEMATE;
    } else if (chess.isThreefoldRepetition()) {
      game.result = GameResult.DRAW;
      game.endReason = GameEndReason.THREEFOLD;
    } else if (chess.isInsufficientMaterial()) {
      game.result = GameResult.DRAW;
      game.endReason = GameEndReason.INSUFFICIENT;
    } else if (reason) {
      game.endReason = reason;
    }

    game.status = GameStatus.FINISHED;
    game.endedAt = new Date();
    game.pgn = chess.pgn();

    if (!game.isVsBot && game.whiteId && game.blackId) {
      await this.applyEloChanges(game);
    }

    const saved = await this.gamesRepo.save(game);
    this.eventEmitter.emit('game.finished', saved);
    return saved;
  }

  async resign(gameId: string, playerId: string): Promise<Game> {
    const game = await this.gamesRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const chess = new Chess(game.currentFen);
    game.result = playerId === game.whiteId ? GameResult.BLACK_WIN : GameResult.WHITE_WIN;
    game.endReason = GameEndReason.RESIGN;

    return this.finishGame(game, chess, GameEndReason.RESIGN);
  }

  async finishOnTimeout(gameId: string, loser: 'white' | 'black'): Promise<Game | null> {
    const game = await this.gamesRepo.findOne({ where: { id: gameId } });
    if (!game) return null;
    if (game.status !== GameStatus.ACTIVE) return game;

    const chess = new Chess(game.currentFen);
    game.result = loser === 'white' ? GameResult.BLACK_WIN : GameResult.WHITE_WIN;
    game.endReason = GameEndReason.TIMEOUT;
    return this.finishGame(game, chess, GameEndReason.TIMEOUT);
  }

  async offerDraw(gameId: string, playerId: string): Promise<Game> {
    const game = await this.gamesRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');
    game.drawOfferedBy = playerId;
    return this.gamesRepo.save(game);
  }

  async acceptDraw(gameId: string): Promise<Game> {
    const game = await this.gamesRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');
    const chess = new Chess(game.currentFen);
    game.result = GameResult.DRAW;
    return this.finishGame(game, chess, GameEndReason.DRAW_AGREEMENT);
  }

  // Marks all of a user's still-active games as abandoned. Called before
  // starting a new game so old/closed games don't linger as "active".
  async abandonActiveGames(userId: string): Promise<void> {
    await this.gamesRepo
      .createQueryBuilder()
      .update(Game)
      .set({ status: GameStatus.ABANDONED, endedAt: () => 'NOW()' })
      .where('(whiteId = :uid OR blackId = :uid)', { uid: userId })
      .andWhere('status = :status', { status: GameStatus.ACTIVE })
      .execute();
  }

  async getActiveGames(userId: string): Promise<Game[]> {
    return this.gamesRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.white', 'white')
      .leftJoinAndSelect('g.black', 'black')
      .where('(g.whiteId = :uid OR g.blackId = :uid)', { uid: userId })
      .andWhere('g.status = :status', { status: GameStatus.ACTIVE })
      .orderBy('g.startedAt', 'DESC')
      .getMany();
  }

  async getGameHistory(userId: string, page = 1, limit = 20): Promise<[Game[], number]> {
    return this.gamesRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.white', 'white')
      .leftJoinAndSelect('g.black', 'black')
      .where('(g.whiteId = :uid OR g.blackId = :uid)', { uid: userId })
      .andWhere('g.status = :status', { status: GameStatus.FINISHED })
      .orderBy('g.endedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async getGameWithMoves(gameId: string): Promise<{ game: Game; moves: Move[] }> {
    const game = await this.gamesRepo.findOne({
      where: { id: gameId },
      relations: { white: true, black: true },
    });
    if (!game) throw new NotFoundException('Game not found');
    const moves = await this.movesRepo.find({
      where: { gameId },
      order: { moveNumber: 'ASC' },
    });
    return { game, moves };
  }

  private async applyEloChanges(game: Game): Promise<void> {
    const white = await this.usersService.findById(game.whiteId!);
    const black = await this.usersService.findById(game.blackId!);
    if (!white || !black) return;

    const resultStr =
      game.result === GameResult.WHITE_WIN
        ? 'white'
        : game.result === GameResult.BLACK_WIN
          ? 'black'
          : 'draw';

    const { whiteNew, blackNew, whiteChange, blackChange } = this.eloService.calculate(
      white.elo,
      black.elo,
      resultStr,
      white.gamesPlayed,
      black.gamesPlayed,
    );

    game.whiteEloChange = whiteChange;
    game.blackEloChange = blackChange;

    await this.dataSource.transaction(async (manager) => {
      await manager.update('users', { id: white.id }, {
        elo: whiteNew,
        bestElo: Math.max(whiteNew, white.bestElo),
      });
      await manager.update('users', { id: black.id }, {
        elo: blackNew,
        bestElo: Math.max(blackNew, black.bestElo),
      });
    });

    await this.ratingService.updateLeaderboard(white.id, whiteNew);
    await this.ratingService.updateLeaderboard(black.id, blackNew);

    const whiteResult = game.result === GameResult.WHITE_WIN ? 'win' : game.result === GameResult.BLACK_WIN ? 'loss' : 'draw';
    const blackResult = game.result === GameResult.BLACK_WIN ? 'win' : game.result === GameResult.WHITE_WIN ? 'loss' : 'draw';
    await this.usersService.incrementGameStats(white.id, whiteResult);
    await this.usersService.incrementGameStats(black.id, blackResult);
  }

  private getTimeSeconds(tc: TimeControl): number {
    const map: Record<TimeControl, number> = {
      [TimeControl.CORRESPONDENCE_1D]: 86400,
      [TimeControl.CORRESPONDENCE_3D]: 259200,
      [TimeControl.CORRESPONDENCE_7D]: 604800,
      [TimeControl.RAPID_10]: 600,
      [TimeControl.RAPID_15]: 900,
      [TimeControl.RAPID_30]: 1800,
      [TimeControl.BLITZ_3]: 180,
      [TimeControl.BLITZ_5]: 300,
      [TimeControl.BULLET_1]: 60,
    };
    return map[tc];
  }
}
