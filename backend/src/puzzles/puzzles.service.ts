import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { Puzzle, PuzzleCategory, PuzzleDifficulty } from '../shared/entities/puzzle.entity';
import { PuzzleAttempt } from '../shared/entities/puzzle-attempt.entity';
import { UsersService } from '../users/users.service';
import { RatingService } from '../rating/rating.service';

const MAX_ATTEMPTS = 3;

@Injectable()
export class PuzzlesService {
  private readonly redis: Redis;

  constructor(
    @InjectRepository(Puzzle)
    private readonly puzzlesRepo: Repository<Puzzle>,
    @InjectRepository(PuzzleAttempt)
    private readonly attemptsRepo: Repository<PuzzleAttempt>,
    private readonly usersService: UsersService,
    private readonly ratingService: RatingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
    });
  }

  async getPuzzles(
    category?: PuzzleCategory,
    difficulty?: PuzzleDifficulty,
    page = 1,
    limit = 20,
  ): Promise<[Puzzle[], number]> {
    const qb = this.puzzlesRepo
      .createQueryBuilder('p')
      .where('p.isActive = true');

    if (category) qb.andWhere('p.category = :category', { category });
    if (difficulty) qb.andWhere('p.difficulty = :difficulty', { difficulty });

    return qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async getDailyPuzzle(): Promise<Puzzle> {
    const key = `daily_puzzle:${new Date().toISOString().slice(0, 10)}`;
    const cached = await this.redis.get(key);

    if (cached) {
      const puzzle = await this.puzzlesRepo.findOne({ where: { id: cached } });
      if (puzzle) return puzzle;
    }

    const count = await this.puzzlesRepo.count({ where: { isActive: true } });
    const offset = Math.floor(Math.random() * count);
    const puzzles = await this.puzzlesRepo.find({
      where: { isActive: true },
      skip: offset,
      take: 1,
    });
    const puzzle = puzzles[0];

    if (!puzzle) throw new NotFoundException('No puzzles available');

    const secondsUntilMidnight = this.secondsUntilMidnight();
    await this.redis.setex(key, secondsUntilMidnight, puzzle.id);

    return puzzle;
  }

  async submitAttempt(
    userId: string,
    puzzleId: string,
    moves: string[],
  ): Promise<{
    correct: boolean;
    attemptsLeft: number;
    solution?: string[];
    explanation?: string;
  }> {
    const puzzle = await this.puzzlesRepo.findOne({ where: { id: puzzleId } });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    let attempt = await this.attemptsRepo.findOne({
      where: { userId, puzzleId },
    });

    if (!attempt) {
      attempt = this.attemptsRepo.create({ userId, puzzleId, attemptsCount: 0 });
    }

    if (attempt.solved) {
      return { correct: true, attemptsLeft: 0, solution: puzzle.solutionMoves };
    }

    await this.puzzlesRepo.increment({ id: puzzleId }, 'timesAttempted', 1);
    await this.usersService.incrementPuzzleAttempted(userId);

    attempt.attemptsCount += 1;
    const correct = this.checkSolution(moves, puzzle.solutionMoves);

    if (correct) {
      attempt.solved = true;
      attempt.solvedAt = new Date();
      await this.attemptsRepo.save(attempt);

      await this.puzzlesRepo.increment({ id: puzzleId }, 'timesSolved', 1);
      await this.usersService.incrementPuzzleSolved(userId);

      const user = await this.usersService.findById(userId);
      if (user) {
        await this.ratingService.updatePuzzleLeaderboard(userId, user.puzzlesSolved);
        this.eventEmitter.emit('puzzle.solved', {
          userId,
          totalSolved: user.puzzlesSolved,
          firstTry: attempt.attemptsCount === 1,
        });
      }

      return { correct: true, attemptsLeft: 0, solution: puzzle.solutionMoves };
    }

    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attempt.attemptsCount);

    if (attemptsLeft === 0 || attempt.attemptsCount >= MAX_ATTEMPTS) {
      attempt.solutionShown = true;
      await this.attemptsRepo.save(attempt);
      return {
        correct: false,
        attemptsLeft: 0,
        solution: puzzle.solutionMoves,
        explanation: puzzle.explanation ?? undefined,
      };
    }

    await this.attemptsRepo.save(attempt);
    return { correct: false, attemptsLeft };
  }

  async showSolution(
    userId: string,
    puzzleId: string,
  ): Promise<{ solution: string[]; explanation?: string }> {
    const puzzle = await this.puzzlesRepo.findOne({ where: { id: puzzleId } });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    let attempt = await this.attemptsRepo.findOne({ where: { userId, puzzleId } });
    if (!attempt) {
      attempt = this.attemptsRepo.create({ userId, puzzleId, solutionShown: true });
    } else {
      attempt.solutionShown = true;
    }
    await this.attemptsRepo.save(attempt);

    return {
      solution: puzzle.solutionMoves,
      explanation: puzzle.explanation ?? undefined,
    };
  }

  async createPuzzle(dto: {
    fen: string;
    solutionMoves: string[];
    category: PuzzleCategory;
    difficulty: PuzzleDifficulty;
    title: string;
    explanation?: string;
  }): Promise<Puzzle> {
    const puzzle = this.puzzlesRepo.create(dto);
    return this.puzzlesRepo.save(puzzle);
  }

  async updatePuzzle(id: string, dto: Partial<Puzzle>): Promise<Puzzle> {
    await this.puzzlesRepo.update(id, dto);
    const updated = await this.puzzlesRepo.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Puzzle not found');
    return updated;
  }

  async deletePuzzle(id: string): Promise<void> {
    await this.puzzlesRepo.delete(id);
  }

  @Cron('0 0 * * *')
  async refreshDailyPuzzle() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = `daily_puzzle:${yesterday.toISOString().slice(0, 10)}`;
    await this.redis.del(key);
  }

  private checkSolution(submitted: string[], solution: string[]): boolean {
    if (submitted.length !== solution.length) return false;
    return submitted.every((m, i) => m === solution[i]);
  }

  private secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }
}
